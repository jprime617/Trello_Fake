import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const loadEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
        process.env[match[1]] = value;
      }
    });
  }
};
loadEnv();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function checkTasks() {
  const { data: tasks, error } = await supabase.from('tasks').select('id, title, due_date, assignee_id');
  if (error) console.error(error);
  else console.log("TODAS AS TAREFAS NO BANCO:", JSON.stringify(tasks, null, 2));

  const { data: tokens } = await supabase.from('user_push_tokens').select('*');
  console.log("TOKENS DE NOTIFICAÇÃO SALVOS:", JSON.stringify(tokens, null, 2));
}
checkTasks();
