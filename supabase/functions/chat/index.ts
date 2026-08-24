// ==========================================================
// EDGE FUNCTION: NOTIFICAÇÃO PUSH DE NOVA MENSAGEM NO CHAT DA TASK
// Disparada pelo client (Board.tsx) logo após inserir um comentário.
// Reenvia notificações para os participantes do board, exceto o remetente.
// ==========================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import admin from 'npm:firebase-admin@13';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

if (!admin.apps.length && firebaseServiceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(firebaseServiceAccount)),
  });
}

function truncate(text: string, max = 80) {
  const clean = text.trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

Deno.serve(async (req) => {
  try {
    const { commentId } = await req.json();
    if (!commentId) {
      return new Response(JSON.stringify({ error: 'commentId é obrigatório' }), { status: 400 });
    }

    if (!admin.apps.length) {
      console.warn('FIREBASE_SERVICE_ACCOUNT ausente — notificação de chat ignorada em modo simulação.');
      return new Response(JSON.stringify({ ok: true, simulated: true }), { status: 200 });
    }

    // 1. Carrega o comentário + remetente
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, content, user_id, task_id, profiles(full_name)')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      console.error('Comentário não encontrado:', commentError?.message);
      return new Response(JSON.stringify({ error: 'Comentário não encontrado' }), { status: 404 });
    }

    // 2. Carrega a cadeia task -> coluna -> board -> projeto
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, column_id, columns(board_id, boards(id, title, project_id))')
      .eq('id', comment.task_id)
      .single();

    if (taskError || !task) {
      console.error('Task do comentário não encontrada:', taskError?.message);
      return new Response(JSON.stringify({ error: 'Task não encontrada' }), { status: 404 });
    }

    const board = (task as any).columns?.boards;
    const boardId: string | undefined = board?.id;
    const projectId: string | undefined = board?.project_id;

    if (!projectId) {
      console.error('Projeto não encontrado para a task', task.id);
      return new Response(JSON.stringify({ error: 'Projeto não encontrado' }), { status: 404 });
    }

    // 3. Resolve participantes do board (dono do projeto + membros), exceto o remetente
    const { data: project } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', projectId)
      .single();

    const { data: members } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId);

    const recipientIds = new Set<string>();
    if (project?.created_by) recipientIds.add(project.created_by);
    (members || []).forEach((m) => recipientIds.add(m.user_id));
    recipientIds.delete(comment.user_id);

    if (recipientIds.size === 0) {
      return new Response(JSON.stringify({ ok: true, notified: 0 }), { status: 200 });
    }

    // 4. Filtra quem desativou notificações de chat
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, notify_chat_messages')
      .in('id', Array.from(recipientIds));

    const enabledRecipientIds = (profiles || [])
      .filter((p) => p.notify_chat_messages !== false)
      .map((p) => p.id);

    if (enabledRecipientIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, notified: 0 }), { status: 200 });
    }

    // 5. Busca tokens dos destinatários habilitados
    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('token, device_type, user_id')
      .in('user_id', enabledRecipientIds);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, notified: 0 }), { status: 200 });
    }

    const senderName = (comment as any).profiles?.full_name || 'Alguém';
    const title = senderName;
    const body = truncate(comment.content);

    let notified = 0;
    for (const item of tokens) {
      try {
        await admin.messaging().send({
          token: item.token,
          notification: { title, body },
          data: {
            type: 'chat',
            taskId: String(task.id),
            boardId: String(boardId ?? ''),
            projectId: String(projectId),
          },
          android: {
            priority: 'high',
            notification: { channelId: 'chat_messages', sound: 'default' },
          },
          webpush: {
            headers: { Urgency: 'high' },
            notification: { icon: '/logo.png', badge: '/logo.png' },
          },
        });
        notified++;
      } catch (err: any) {
        console.error(`Erro ao enviar notificação de chat para token (${item.device_type}):`, err.message);
        if (
          err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered'
        ) {
          await supabase.from('user_push_tokens').delete().eq('token', item.token);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, notified }), { status: 200 });
  } catch (err: any) {
    console.error('Erro crítico na function chat:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
