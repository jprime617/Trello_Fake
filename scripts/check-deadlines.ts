import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

// 1. Carregar variáveis de ambiente do arquivo .env
const loadEnv = () => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log('Variáveis de ambiente do arquivo .env carregadas com sucesso.');
    }
  } catch (e) {
    console.warn('Não foi possível ler o arquivo .env:', e);
  }
};

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY são necessários no .env.');
  process.exit(1);
}

// Inicializa cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Inicializa Firebase Admin SDK
let firebaseAdminReady = false;
const firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (firebaseServiceAccount) {
  try {
    const serviceAccount = JSON.parse(firebaseServiceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseAdminReady = true;
    console.log('Firebase Admin SDK inicializado via FIREBASE_SERVICE_ACCOUNT.');
  } catch (e: any) {
    console.error('Erro ao fazer parse de FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
  }
} else {
  // Procura por arquivo serviceAccountKey.json padrão no diretório scripts
  const keyPath = path.resolve(process.cwd(), 'scripts', 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(keyPath)
      });
      firebaseAdminReady = true;
      console.log('Firebase Admin SDK inicializado usando scripts/serviceAccountKey.json.');
    } catch (e: any) {
      console.error('Erro ao ler scripts/serviceAccountKey.json:', e.message);
    }
  } else {
    console.warn('AVISO: Credenciais do Firebase Admin não encontradas.');
    console.warn('O script rodará em MODO SIMULAÇÃO (DRY RUN). Nenhuma notificação real será enviada ao FCM.');
  }
}

async function runDeadlineCheck() {
  console.log('--- Iniciando Verificação de Prazos ---');
  
  // 1. Obter a data atual do servidor
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log(`Data base de comparação (hoje): ${today.toLocaleDateString()} (00:00:00)`);

  // 2. Buscar todas as tarefas que têm prazo (due_date) e estão atribuídas a alguém
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      due_date,
      assignee_id,
      columns (
        title,
        board_id,
        boards (
          id,
          project_id
        )
      )
    `)
    .not('due_date', 'is', null)
    .not('assignee_id', 'is', null);

  if (tasksError) {
    console.error('Erro ao buscar tarefas do banco:', tasksError.message);
    return;
  }

  if (!tasks || tasks.length === 0) {
    console.log('Nenhuma tarefa com prazo pendente encontrada.');
    return;
  }

  console.log(`Encontradas ${tasks.length} tarefas com prazo configurado.`);

  // Filtra colunas concluídas para evitar spam de tarefas finalizadas
  const completedColumnNames = ['done', 'concluido', 'concluído', 'pronto', 'finished', 'arquivado', 'archive'];
  const activeTasks = tasks.filter((task: any) => {
    const colTitle = task.columns?.title?.toLowerCase() || '';
    const isCompleted = completedColumnNames.some(name => colTitle.includes(name));
    return !isCompleted;
  });

  console.log(`${activeTasks.length} tarefas ativas após filtrar colunas concluídas.`);

  // 3. Buscar perfis dos usuários que possuem alert_preference configurado
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, alert_preference, notify_task_deadlines')
    .not('alert_preference', 'is', null);

  if (profilesError) {
    console.error('Erro ao buscar perfis dos usuários:', profilesError.message);
    return;
  }

  // Criar um mapa rápido de perfis para consulta por id
  const profileMap = new Map<string, { full_name: string; alert_preference: string; notify_task_deadlines: boolean }>();
  profiles.forEach(p => {
    profileMap.set(p.id, {
      full_name: p.full_name,
      alert_preference: p.alert_preference || '48h',
      notify_task_deadlines: p.notify_task_deadlines !== false
    });
  });

  // 4. Buscar os tokens push salvos para os usuários
  const { data: tokens, error: tokensError } = await supabase
    .from('user_push_tokens')
    .select('user_id, token, device_type');

  if (tokensError) {
    console.error('Erro ao buscar tokens push do banco:', tokensError.message);
    return;
  }

  // Criar um mapa de tokens agrupados por user_id
  const tokenMap = new Map<string, Array<{ token: string; device_type: string }>>();
  tokens.forEach(t => {
    if (!tokenMap.has(t.user_id)) {
      tokenMap.set(t.user_id, []);
    }
    tokenMap.get(t.user_id)!.push({
      token: t.token,
      device_type: t.device_type
    });
  });

  console.log(`Carregados ${tokens.length} tokens FCM válidos.`);

  let notificationsSent = 0;

  // 5. Analisar as tarefas e disparar alertas caso se enquadrem na preferência
  for (const task of activeTasks) {
    const assigneeId = task.assignee_id;
    const profile = profileMap.get(assigneeId);
    if (!profile || !profile.notify_task_deadlines) continue;

    const userTokens = tokenMap.get(assigneeId) || [];
    if (userTokens.length === 0) continue;

    // Calcular horas exatas até o vencimento
    const taskDueDate = new Date(task.due_date);
    const now = new Date();
    const diffTime = taskDueDate.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);

    // Ignora tarefas que já venceram no passado
    if (diffHours < 0) continue;

    // Determinar se o usuário deve ser notificado baseado na sua preferência.
    // O aviso final de 1h dispara sempre, além do aviso na janela configurada
    // (24h/48h/7d) — cada um com um "threshold" próprio para permitir os dois
    // avisos sem duplicar notificações dentro da mesma janela.
    let matchedThreshold: string | null = null;
    const pref = profile.alert_preference;

    if (diffHours > 0 && diffHours <= 1) {
      matchedThreshold = '1h';
    } else if (pref === '24h' && diffHours > 23 && diffHours <= 24) {
      matchedThreshold = '24h';
    } else if (pref === '48h' && diffHours > 47 && diffHours <= 48) {
      matchedThreshold = '48h';
    } else if (pref === '7d' && diffHours > 167 && diffHours <= 168) {
      matchedThreshold = '7d';
    }

    if (matchedThreshold) {
      // Evita reenviar o mesmo aviso (mesma task/usuário/threshold) se o job rodar de novo
      const { data: alreadySent } = await supabase
        .from('task_deadline_notifications_log')
        .select('id')
        .eq('task_id', task.id)
        .eq('user_id', assigneeId)
        .eq('threshold', matchedThreshold)
        .maybeSingle();

      if (alreadySent) continue;

      const title = 'Aviso de Prazo de Tarefa ⏰';
      let body = '';
      if (diffHours <= 1) {
        body = `A tarefa "${task.title}" vence em menos de 1 hora!`;
      } else if (diffHours <= 24) {
        body = `A tarefa "${task.title}" vence nas próximas 24 horas!`;
      } else {
        body = `A tarefa "${task.title}" vence em breve (${taskDueDate.toLocaleString('pt-BR')}).`;
      }

      console.log(`[ALERTA] Notificando ${profile.full_name} (${matchedThreshold}) sobre a tarefa "${task.title}" (vence em ${Math.round(diffHours)}h).`);

      const boardId = (task as any).columns?.board_id ?? (task as any).columns?.boards?.id ?? '';
      const projectId = (task as any).columns?.boards?.project_id ?? '';

      // Registra o envio antes de disparar para evitar reenvio em execuções concorrentes/atrasadas do job
      await supabase
        .from('task_deadline_notifications_log')
        .upsert(
          { task_id: task.id, user_id: assigneeId, threshold: matchedThreshold },
          { onConflict: 'task_id,user_id,threshold', ignoreDuplicates: true }
        );

      // Envia notificação para todos os dispositivos do usuário
      for (const item of userTokens) {
        try {
          if (firebaseAdminReady) {
            const message = {
              token: item.token,
              notification: {
                title,
                body,
              },
              data: {
                taskId: String(task.id),
                boardId: String(boardId),
                projectId: String(projectId),
              },
              android: {
                priority: 'high' as const,
                notification: {
                  channelId: 'task_deadlines',
                  sound: 'default',
                  clickAction: 'open_app',
                }
              },
              webpush: {
                headers: {
                  Urgency: 'high',
                },
                notification: {
                  icon: '/logo.png',
                  badge: '/logo.png',
                  requireInteraction: true,
                }
              }
            };

            await admin.messaging().send(message);
            console.log(`  -> Notificação enviada com sucesso para o token do tipo: ${item.device_type}`);
          } else {
            console.log(`  -> [SIMULAÇÃO] FCM Send: Token (${item.device_type}) "${item.token.substring(0, 10)}..." | Title: "${title}" | Body: "${body}"`);
          }
          notificationsSent++;
        } catch (fcmError: any) {
          console.error(`  -> Erro ao enviar notificação para token (${item.device_type}):`, fcmError.message);
          
          if (
            fcmError.code === 'messaging/invalid-registration-token' ||
            fcmError.code === 'messaging/registration-token-not-registered'
          ) {
            console.log(`  -> Removendo token inválido do banco: ${item.token.substring(0, 15)}...`);
            await supabase
              .from('user_push_tokens')
              .delete()
              .eq('token', item.token);
          }
        }
      }
    }
  }

  console.log(`--- Verificação Concluída. ${notificationsSent} notificações processadas. ---`);
}

runDeadlineCheck().catch(err => {
  console.error('Erro crítico no script de prazos:', err);
  process.exit(1);
});
