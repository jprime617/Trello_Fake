import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { supabase } from '../lib/supabase';
import { ColumnContainer } from './ColumnContainer';
import { CardModal } from './CardModal';
import { ColumnModal } from './ColumnModal';
import { Kanban, Sparkles, Loader2, RefreshCw, Plus, Users, Trash2 } from 'lucide-react';
import { useCustomModal } from './CustomModals';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  avatar_emoji?: string;
  role?: string;
}

interface Column {
  id: string;
  title: string;
  position: number;
  board_id: string;
}

interface Task {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  position: number;
  labels: { name: string; color: string }[];
  attachments: { name: string; url: string; type: string }[];
}

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
}

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface BoardData {
  id: string;
  title: string;
  description?: string;
  created_at: string;
}

interface BoardProps {
  isColumnModalOpen: boolean;
  setIsColumnModalOpen: (val: boolean) => void;
  isCardModalOpen: boolean;
  setIsCardModalOpen: (val: boolean) => void;
  selectedColumnId: string | undefined;
  setSelectedColumnId: (id: string | undefined) => void;
  activeBoardId: string;
  boards: BoardData[];
  setActiveBoardId: (id: string) => void;
  onCreateBoard: (title: string, description?: string) => void;
  alertPreference: '24h' | '48h' | '7d';
  userId: string;
  onAlertsCalculated: (alerts: any[]) => void;
  projectMembers?: Profile[];
  onAddProjectMember?: (email: string) => Promise<boolean>;
  onRemoveProjectMember?: (memberId: string) => Promise<void>;
  allProfiles?: Profile[];
  filterAssigneeId?: string;
  setFilterAssigneeId?: (id: string) => void;
  boardBackground?: string;
}

export const Board: React.FC<BoardProps> = ({
  isColumnModalOpen,
  setIsColumnModalOpen,
  isCardModalOpen,
  setIsCardModalOpen,
  selectedColumnId,
  setSelectedColumnId,
  activeBoardId,
  boards,
  setActiveBoardId,
  onCreateBoard,
  alertPreference,
  userId,
  onAlertsCalculated,
  projectMembers = [],
  onAddProjectMember = async () => false,
  onRemoveProjectMember = async () => {},
  allProfiles = [],
  filterAssigneeId = '',
  setFilterAssigneeId = () => {},
  boardBackground = 'zinc',
}) => {
  const { toast, confirm, prompt } = useCustomModal();
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const [isAddingMemberMobile, setIsAddingMemberMobile] = useState(false);
  const [selectedMemberEmailMobile, setSelectedMemberEmailMobile] = useState('');

  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Coletar todas as etiquetas únicas presentes nas tarefas do quadro para reutilização
  const projectLabels = useMemo(() => {
    const labelMap = new Map<string, string>();
    tasks.forEach((task) => {
      if (task.labels && Array.isArray(task.labels)) {
        task.labels.forEach((l) => {
          if (l && l.name && l.name.trim()) {
            labelMap.set(l.name.trim().toLowerCase(), l.color);
          }
        });
      }
    });
    return Array.from(labelMap.entries()).map(([name, color]) => ({
      name,
      color,
    }));
  }, [tasks]);

  // 1. Carregar todos os dados dependentes da Sprint selecionada
  const fetchData = async () => {
    if (!activeBoardId) {
      setColumns([]);
      setTasks([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // Carregar Perfis (limitar aos membros do projeto ativo se especificado)
      if (projectMembers && projectMembers.length > 0) {
        setProfiles(projectMembers);
      } else {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*');
        if (profileErr) throw profileErr;
        setProfiles(profileData || []);
      }

      // Carregar Colunas vinculadas à Sprint atual
      const { data: columnData, error: columnErr } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', activeBoardId)
        .order('position', { ascending: true });
      if (columnErr) throw columnErr;
      setColumns(columnData || []);

      // Pegar os IDs das colunas desta Sprint para filtrar tarefas
      const activeColIds = (columnData || []).map((c) => c.id);

      // Carregar todas as Tarefas
      const { data: taskData, error: taskErr } = await supabase
        .from('tasks')
        .select('*')
        .order('position', { ascending: true });
      if (taskErr) throw taskErr;
      
      // Filtrar as tarefas locais da Sprint atual
      const allTasks = (taskData || []) as Task[];
      const filteredTasks = allTasks.filter((t) => activeColIds.includes(t.column_id));
      setTasks(filteredTasks);

      // Carregar todas as Subtarefas (Checklist)
      const { data: subtaskData, error: subtaskErr } = await supabase
        .from('subtasks')
        .select('*');
      if (subtaskErr) throw subtaskErr;
      setSubtasks((subtaskData || []) as Subtask[]);

      // Carregar todos os Comentários
      const { data: commentsData, error: commentsErr } = await supabase
        .from('comments')
        .select('*');
      if (commentsErr) throw commentsErr;
      setComments((commentsData || []) as Comment[]);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBoardId]);

  // 2. Efeito para recalcular alertas sempre que as tarefas mudam
  useEffect(() => {
    if (!activeBoardId || tasks.length === 0) {
      onAlertsCalculated([]);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeAlerts = tasks.filter((task) => {
      if (!task.due_date) return false;
      const dueDate = new Date(task.due_date + 'T00:00:00');
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (alertPreference === '24h') {
        return diffDays <= 1; // Expira hoje, amanhã ou está atrasado
      } else if (alertPreference === '48h') {
        return diffDays <= 2;
      } else {
        return diffDays <= 7; // Expira na semana
      }
    });

    onAlertsCalculated(activeAlerts);
  }, [tasks, alertPreference, activeBoardId]);

  // 3. Configurar canais Supabase Realtime
  useEffect(() => {
    if (!activeBoardId) return;

    // Inscrição em tempo real para colunas
    const columnsSubscription = supabase
      .channel('columns-realtime-board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'columns' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCol = payload.new as Column;
            if (newCol.board_id === activeBoardId) {
              setColumns((prev) => {
                if (prev.some((c) => c.id === newCol.id)) return prev;
                return [...prev, newCol].sort((a, b) => a.position - b.position);
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedCol = payload.new as Column;
            if (updatedCol.board_id === activeBoardId) {
              setColumns((prev) =>
                prev
                  .map((c) => (c.id === updatedCol.id ? updatedCol : c))
                  .sort((a, b) => a.position - b.position)
              );
            } else {
              // Se mudou de board_id, remove do estado local
              setColumns((prev) => prev.filter((c) => c.id !== updatedCol.id));
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedCol = payload.old as { id: string };
            setColumns((prev) => prev.filter((c) => c.id !== deletedCol.id));
          }
        }
      )
      .subscribe();

    // Inscrição para tarefas
    const tasksSubscription = supabase
      .channel('tasks-realtime-board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            // Carregar as colunas vigentes para validar se pertence a esta Sprint
            setColumns((currentCols) => {
              const colIds = currentCols.map((c) => c.id);
              if (colIds.includes(newTask.column_id)) {
                setTasks((prev) => {
                  if (prev.some((t) => t.id === newTask.id)) return prev;
                  return [...prev, newTask].sort((a, b) => a.position - b.position);
                });
              }
              return currentCols;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setColumns((currentCols) => {
              const colIds = currentCols.map((c) => c.id);
              if (colIds.includes(updatedTask.column_id)) {
                setTasks((prev) => {
                  const exists = prev.some((t) => t.id === updatedTask.id);
                  if (exists) {
                    return prev
                      .map((t) => (t.id === updatedTask.id ? updatedTask : t))
                      .sort((a, b) => a.position - b.position);
                  } else {
                    return [...prev, updatedTask].sort((a, b) => a.position - b.position);
                  }
                });
              } else {
                // Se foi atualizado para uma coluna de outra Sprint, remove localmente
                setTasks((prev) => prev.filter((t) => t.id !== updatedTask.id));
              }
              return currentCols;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedTask = payload.old as { id: string };
            setTasks((prev) => prev.filter((t) => t.id !== deletedTask.id));
          }
        }
      )
      .subscribe();

    // Inscrição em tempo real para subtarefas
    const subtasksSubscription = supabase
      .channel('subtasks-realtime-board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subtasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSub = payload.new as Subtask;
            setSubtasks((prev) => {
              if (prev.some((s) => s.id === newSub.id)) return prev;
              return [...prev, newSub];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedSub = payload.new as Subtask;
            setSubtasks((prev) =>
              prev.map((s) => (s.id === updatedSub.id ? updatedSub : s))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedSub = payload.old as { id: string };
            setSubtasks((prev) => prev.filter((s) => s.id !== deletedSub.id));
          }
        }
      )
      .subscribe();

    // Inscrição em tempo real para comentários
    const commentsSubscription = supabase
      .channel('comments-realtime-board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newComment = payload.new as Comment;
            setComments((prev) => {
              if (prev.some((c) => c.id === newComment.id)) return prev;
              return [...prev, newComment];
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedComment = payload.old as { id: string };
            setComments((prev) => prev.filter((c) => c.id !== deletedComment.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(columnsSubscription);
      supabase.removeChannel(tasksSubscription);
      supabase.removeChannel(subtasksSubscription);
      supabase.removeChannel(commentsSubscription);
    };
  }, [activeBoardId]);

  // Sincronizar perfis locais com projectMembers caso mude via Sidebar
  useEffect(() => {
    if (projectMembers && projectMembers.length > 0) {
      setProfiles(projectMembers);
    }
  }, [projectMembers]);

  // 4. Lógica do Drag and Drop
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === 'column') {
      const reorderedCols = [...columns];
      const [removed] = reorderedCols.splice(source.index, 1);
      reorderedCols.splice(destination.index, 0, removed);

      const newPositions = reorderedCols.map((c, idx) => ({
        ...c,
        position: idx + 1,
      }));

      setColumns(newPositions);

      // Sincronizar com o banco de dados
      for (const col of newPositions) {
        await supabase
          .from('columns')
          .update({ position: col.position })
          .eq('id', col.id);
      }
      return;
    }

    if (type === 'task') {
      const sourceColId = source.droppableId;
      const destColId = destination.droppableId;

      const columnTasks = tasks.filter((t) => t.column_id === destColId).sort((a, b) => a.position - b.position);
      const sourceTasks = tasks.filter((t) => t.column_id === sourceColId).sort((a, b) => a.position - b.position);

      const draggedTask = tasks.find((t) => t.id === draggableId);
      if (!draggedTask) return;

      let updatedTasks = [...tasks];

      if (sourceColId === destColId) {
        const reordered = [...columnTasks];
        const [removed] = reordered.splice(source.index, 1);
        reordered.splice(destination.index, 0, removed);

        const newPositions = reordered.map((t, idx) => ({
          ...t,
          position: idx + 1,
        }));

        updatedTasks = updatedTasks.map((t) => {
          const found = newPositions.find((np) => np.id === t.id);
          return found ? found : t;
        });

        setTasks(updatedTasks);

        for (const taskItem of newPositions) {
          await supabase
            .from('tasks')
            .update({ position: taskItem.position })
            .eq('id', taskItem.id);
        }
      } else {
        const sourceReordered = [...sourceTasks];
        const [removed] = sourceReordered.splice(source.index, 1);
        
        const updatedDraggedTask = { ...removed, column_id: destColId };
        
        const destReordered = [...columnTasks];
        destReordered.splice(destination.index, 0, updatedDraggedTask);

        const newSourcePositions = sourceReordered.map((t, idx) => ({
          ...t,
          position: idx + 1,
        }));

        const newDestPositions = destReordered.map((t, idx) => ({
          ...t,
          position: idx + 1,
        }));

        updatedTasks = updatedTasks.map((t) => {
          if (t.id === draggableId) {
            return { ...updatedDraggedTask, position: destination.index + 1 };
          }
          const sourceFound = newSourcePositions.find((np) => np.id === t.id);
          if (sourceFound) return sourceFound;

          const destFound = newDestPositions.find((np) => np.id === t.id);
          if (destFound) return destFound;

          return t;
        });

        setTasks(updatedTasks);

        await supabase
          .from('tasks')
          .update({ column_id: destColId, position: destination.index + 1 })
          .eq('id', draggableId);

        for (const taskItem of newSourcePositions) {
          await supabase
            .from('tasks')
            .update({ position: taskItem.position })
            .eq('id', taskItem.id);
        }

        for (const taskItem of newDestPositions) {
          if (taskItem.id !== draggableId) {
            await supabase
              .from('tasks')
              .update({ position: taskItem.position })
              .eq('id', taskItem.id);
          }
        }
      }
    }
  };

  // 5. Salvar/Criar Coluna
  const handleSaveColumn = async (title: string) => {
    if (!activeBoardId) return;
    try {
      if (editingColumn) {
        const { error } = await supabase
          .from('columns')
          .update({ title })
          .eq('id', editingColumn.id);
        if (error) throw error;
      } else {
        const nextPosition = columns.length > 0 ? Math.max(...columns.map((c) => c.position)) + 1 : 1;
        const { error } = await supabase
          .from('columns')
          .insert({ title, position: nextPosition, board_id: activeBoardId });
        if (error) throw error;
      }
    } catch (err: any) {
      toast('Erro ao salvar coluna: ' + err.message, 'error');
    } finally {
      setEditingColumn(null);
    }
  };

  // 6. Excluir Coluna
  const handleDeleteColumn = async (columnId: string) => {
    const isConfirmed = await confirm('Tem certeza que deseja excluir esta coluna e todas as suas tarefas?');
    if (isConfirmed) {
      try {
        const { error } = await supabase.from('columns').delete().eq('id', columnId);
        if (error) throw error;
        toast('Coluna excluída com sucesso!', 'success');
      } catch (err: any) {
        toast('Erro ao excluir coluna: ' + err.message, 'error');
      }
    }
  };

  // 7. Salvar/Criar Cartão de Tarefa
  const handleSaveCard = async (cardData: any) => {
    try {
      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update({
            title: cardData.title,
            description: cardData.description,
            assignee_id: cardData.assignee_id,
            due_date: cardData.due_date,
            priority: cardData.priority,
            labels: cardData.labels || [],
            attachments: cardData.attachments || [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTask.id);
        if (error) throw error;
      } else {
        const colId = cardData.column_id || selectedColumnId || columns[0]?.id;
        if (!colId) throw new Error('Selecione ou crie uma coluna para inserir a tarefa.');

        const colTasks = tasks.filter((t) => t.column_id === colId);
        const nextPosition = colTasks.length > 0 ? Math.max(...colTasks.map((t) => t.position)) + 1 : 1;

        const { error } = await supabase.from('tasks').insert({
          column_id: colId,
          title: cardData.title,
          description: cardData.description,
          assignee_id: cardData.assignee_id,
          due_date: cardData.due_date,
          priority: cardData.priority,
          labels: cardData.labels || [],
          attachments: cardData.attachments || [],
          position: nextPosition,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      toast('Erro ao salvar tarefa: ' + err.message, 'error');
    } finally {
      setEditingTask(null);
      setSelectedColumnId(undefined);
    }
  };

  // 8. Excluir Cartão de Tarefa
  const handleDeleteCard = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast('Tarefa excluída com sucesso!', 'success');
    } catch (err: any) {
      toast('Erro ao excluir tarefa: ' + err.message, 'error');
    } finally {
      setEditingTask(null);
    }
  };

  // 9. Handlers para Subtarefas (Checklist)
  const handleAddSubtask = async (title: string, taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .insert({ task_id: taskId, title, is_completed: false })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setSubtasks((prev) => [...prev, data as Subtask]);
      }
    } catch (err: any) {
      toast('Erro ao adicionar subtarefa: ' + err.message, 'error');
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, is_completed: isCompleted } : s))
      );

      const { error } = await supabase
        .from('subtasks')
        .update({ is_completed: isCompleted })
        .eq('id', subtaskId);
      if (error) throw error;
    } catch (err: any) {
      toast('Erro ao atualizar subtarefa: ' + err.message, 'error');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));

      const { error } = await supabase
        .from('subtasks')
        .delete().eq('id', subtaskId);
      if (error) throw error;
    } catch (err: any) {
      toast('Erro ao excluir subtarefa: ' + err.message, 'error');
    }
  };

  // 10. Handlers para Comentários
  const handleAddComment = async (content: string, taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          task_id: taskId,
          user_id: userId,
          content
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setComments((prev) => [...prev, data as Comment]);
      }
    } catch (err: any) {
      toast('Erro ao adicionar comentário: ' + err.message, 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    } catch (err: any) {
      toast('Erro ao excluir comentário: ' + err.message, 'error');
    }
  };

  const bgClasses: Record<string, string> = {
    zinc: 'bg-zinc-950',
    sunset: 'bg-gradient-to-tr from-purple-950/60 via-zinc-950 to-pink-950/20',
    ocean: 'bg-gradient-to-tr from-blue-950/60 via-zinc-950 to-cyan-950/20',
    aurora: 'bg-gradient-to-tr from-emerald-950/60 via-zinc-950 to-teal-950/20',
    cosmic: 'bg-gradient-to-tr from-violet-950/60 via-zinc-950 to-indigo-950/20',
    obsidian: 'bg-[#020617]',
    cyberpunk: 'bg-gradient-to-tr from-fuchsia-950/60 via-zinc-950 to-yellow-950/20',
    forest: 'bg-gradient-to-tr from-emerald-950/60 via-zinc-950 to-emerald-950/15',
    volcano: 'bg-gradient-to-tr from-red-950/60 via-zinc-950 to-amber-950/20',
    lavender: 'bg-gradient-to-tr from-purple-950/50 via-zinc-950 to-sky-950/25',
  };
  const boardBgClass = bgClasses[boardBackground] || bgClasses.zinc;

  return (
    <div className={`flex-1 flex flex-col min-w-0 ${boardBgClass} relative pb-16 lg:pb-0 h-screen overflow-hidden`}>
      {/* Top Header Panel */}
      {/* Mobile Header Structure */}
      <header className="lg:hidden pt-[env(safe-area-inset-top,16px)] pb-3.5 px-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex flex-col gap-3 shrink-0 shadow-lg shadow-black/20 select-none">
        {/* Row 1: Logo, Title & Sprint Selector */}
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-brand-accent/10 border border-brand-accent/40 flex items-center justify-center text-brand-accent shrink-0 shadow-sm shadow-brand-accent/5">
              <Kanban size={14} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-extrabold text-white truncate tracking-tight my-0">
                Quadro Kanban
              </h2>
            </div>
          </div>

          {/* Sprint Selector */}
          {boards.length > 0 && (
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded-xl shrink-0 shadow-inner">
              <select
                value={activeBoardId}
                onChange={(e) => setActiveBoardId(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-white focus:outline-none cursor-pointer pr-1"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-950 text-white">
                    {b.title}
                  </option>
                ))}
              </select>
              <button
                onClick={async () => {
                  const title = await prompt('Qual o nome da nova Sprint?', 'Ex: Sprint 2');
                  if (title && title.trim()) {
                    const desc = await prompt('Descrição da Sprint (Opcional):', 'Foco ou objetivos desta sprint');
                    onCreateBoard(title.trim(), desc?.trim() || undefined);
                  }
                }}
                className="p-0.5 rounded-md text-zinc-400 hover:text-white"
                title="Nova Sprint"
              >
                <Plus size={10} />
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Action Buttons (Membros, Recarregar, Nova Coluna) */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {/* Members Button */}
          <button
            onClick={() => setIsMembersDrawerOpen(true)}
            className="flex items-center justify-center gap-1 px-1 py-2 bg-zinc-900 border border-zinc-800 active:border-zinc-600 rounded-xl text-[10px] font-bold text-zinc-200 transition-all shadow-sm"
          >
            <Users size={12} className="text-brand-accent shrink-0" />
            <span className="truncate">Membros ({projectMembers.length})</span>
          </button>

          {/* Reload Button */}
          <button
            onClick={fetchData}
            className="flex items-center justify-center gap-1 px-1 py-2 bg-zinc-900 border border-zinc-800 active:border-zinc-600 rounded-xl text-[10px] font-bold text-zinc-200 transition-all shadow-sm"
          >
            <RefreshCw size={11} className="text-zinc-400 shrink-0" />
            <span className="truncate">Atualizar</span>
          </button>

          {/* Add Column Button */}
          <button
            onClick={() => {
              if (boards.length === 0) {
                toast('Por favor, crie uma Sprint primeiro antes de adicionar colunas!', 'info');
                return;
              }
              setIsColumnModalOpen(true);
            }}
            className="flex items-center justify-center gap-1 px-1 py-2 bg-brand-accent border border-brand-accent/40 rounded-xl text-[10px] font-bold text-white transition-all shadow-sm shadow-brand-accent/10 active:scale-[0.98]"
          >
            <Plus size={12} className="shrink-0" />
            <span className="truncate">Nova Coluna</span>
          </button>
        </div>
      </header>

      {/* Desktop Header Structure */}
      <header className="hidden lg:flex h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 items-center justify-between shrink-0 select-none shadow-lg shadow-black/20">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8.5 h-8.5 rounded-xl bg-brand-accent/10 border border-brand-accent/40 flex items-center justify-center text-brand-accent shadow-md shadow-brand-accent/5">
              <Kanban size={16} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white leading-tight my-0 tracking-tight">
                Quadro Kanban
              </h2>
              <p className="flex text-[9px] text-zinc-500 font-semibold tracking-wide items-center gap-1 mt-0.5 my-0">
                <Sparkles size={9} className="text-yellow-500/80 animate-pulse" />
                <span>Tempo Real</span>
              </p>
            </div>
          </div>

          {/* Seletor de Sprint Responsivo */}
          {boards.length > 0 && (
            <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded-xl min-w-0 shadow-inner">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Sprint:</span>
              <select
                value={activeBoardId}
                onChange={(e) => setActiveBoardId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer hover:text-brand-accent transition-colors pr-4 py-0.5 truncate"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-950 text-white">
                    {b.title}
                  </option>
                ))}
              </select>
              <button
                onClick={async () => {
                  const title = await prompt('Qual o nome da nova Sprint?', 'Ex: Sprint 2');
                  if (title && title.trim()) {
                    const desc = await prompt('Descrição da Sprint (Opcional):', 'Foco ou objetivos desta sprint');
                    onCreateBoard(title.trim(), desc?.trim() || undefined);
                  }
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700"
                title="Nova Sprint"
              >
                <Plus size={11} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Membros / Usuários Trigger */}
          <button
            onClick={() => setIsMembersDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-xl text-xs font-bold text-zinc-200 transition-all shadow-md shadow-black/20 shrink-0"
          >
            <Users size={13} className="text-brand-accent" />
            <span>Membros</span>
            {projectMembers.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand-accent/25 border border-brand-accent/40 text-[9px] text-white flex items-center justify-center font-bold">
                {projectMembers.length}
              </span>
            )}
          </button>

          <button
            onClick={fetchData}
            title="Recarregar Quadro"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all active:rotate-45 shrink-0 shadow-md"
          >
            <RefreshCw size={13} className="md:size-[15px]" />
          </button>
          <button
            onClick={() => {
              if (boards.length === 0) {
                toast('Por favor, crie uma Sprint primeiro antes de adicionar colunas!', 'info');
                return;
              }
              setIsColumnModalOpen(true);
            }}
            className="px-3 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white border border-brand-accent/40 hover:border-brand-accent rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-accent/10 active:scale-[0.98] shrink-0"
          >
            Nova Coluna
          </button>
        </div>
      </header>

      {/* Banner de Filtro de Participante */}
      {filterAssigneeId && (
        <div className="mx-4 lg:mx-6 mb-2 px-4 py-2 bg-brand-accent/10 border border-brand-accent/25 rounded-xl flex items-center justify-between text-xs text-brand-accent font-semibold select-none animate-fadeIn">
          <span className="flex items-center gap-2">
            <Sparkles size={14} className="text-brand-accent animate-pulse" />
            <span>
              Filtrando tarefas de: <strong>{profiles.find((p) => p.id === filterAssigneeId)?.full_name || 'Usuário'}</strong>
            </span>
          </span>
          <button
            onClick={() => setFilterAssigneeId('')}
            className="px-2.5 py-1 rounded-lg bg-brand-accent/20 hover:bg-brand-accent/35 text-white transition-all text-[10px] font-bold active:scale-95 border border-brand-accent/20 hover:border-brand-accent/35"
          >
            Limpar Filtro
          </button>
        </div>
      )}

      {/* Board Columns container */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden px-4 lg:px-6 py-4 lg:py-6 snap-x snap-mandatory scroll-smooth">
        {loading ? (
          <div className="w-full h-[60vh] flex flex-col items-center justify-center text-zinc-500 gap-3">
            <Loader2 className="animate-spin text-brand-accent" size={32} />
            <span className="text-xs font-semibold tracking-wider">Carregando dados da Sprint...</span>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="all-columns" direction="horizontal" type="column">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex gap-5 h-full items-start pb-4"
                >
                  {boards.length === 0 ? (
                    <div className="w-full h-[55vh] border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 text-sm gap-3 bg-zinc-950/10">
                      <Kanban size={32} className="text-zinc-700 animate-pulse" />
                      <div className="text-center">
                        <h3 className="font-semibold text-white mb-1">Nenhuma Sprint neste Projeto</h3>
                        <p className="text-xs text-zinc-500">Crie uma Sprint (ciclo de entregas) para poder adicionar colunas e tarefas.</p>
                      </div>
                      <button
                        onClick={async () => {
                          const title = await prompt('Qual o nome da nova Sprint?', 'Ex: Sprint 1');
                          if (title && title.trim()) {
                            const desc = await prompt('Descrição da Sprint (Opcional):', 'Foco ou objetivos desta sprint');
                            onCreateBoard(title.trim(), desc?.trim() || undefined);
                          }
                        }}
                        className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 animate-pulse"
                      >
                        Criar primeira Sprint
                      </button>
                    </div>
                  ) : columns.length > 0 ? (
                    columns.map((column, index) => (
                      <Draggable key={column.id} draggableId={column.id} index={index}>
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                          >
                            <ColumnContainer
                              column={column}
                              tasks={tasks.filter(
                                (t) =>
                                  t.column_id === column.id &&
                                  (!filterAssigneeId || t.assignee_id === filterAssigneeId)
                              )}
                              profiles={profiles}
                              subtasks={subtasks}
                              onCardClick={(task) => {
                                setEditingTask(task);
                                setIsCardModalOpen(true);
                              }}
                              onAddTaskClick={(colId) => {
                                setSelectedColumnId(colId);
                                setIsCardModalOpen(true);
                              }}
                              onEditColumnClick={(col) => {
                                setEditingColumn(col);
                                setIsColumnModalOpen(true);
                              }}
                              onDeleteColumnClick={handleDeleteColumn}
                              dragHandleProps={dragProvided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))
                  ) : (
                    <div className="w-full h-[55vh] border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 text-sm gap-3 bg-zinc-950/10">
                      <Kanban size={32} className="text-zinc-700 animate-pulse" />
                      <div className="text-center">
                        <h3 className="font-semibold text-white mb-1">Nenhuma coluna nesta Sprint</h3>
                        <p className="text-xs text-zinc-500">Crie colunas para começar a organizar as tarefas do grupo</p>
                      </div>
                      <button
                        onClick={() => setIsColumnModalOpen(true)}
                        className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95"
                      >
                        Criar primeira coluna
                      </button>
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </main>

      {/* Modals Container */}
      <ColumnModal
        isOpen={isColumnModalOpen}
        onClose={() => {
          setIsColumnModalOpen(false);
          setEditingColumn(null);
        }}
        onSave={handleSaveColumn}
        editingColumn={editingColumn}
      />

      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setEditingTask(null);
          setSelectedColumnId(undefined);
        }}
        onSave={handleSaveCard}
        onDelete={handleDeleteCard}
        editingTask={editingTask}
        profiles={profiles}
        defaultColumnId={selectedColumnId}
        subtasks={subtasks.filter((s) => editingTask && s.task_id === editingTask.id)}
        onAddSubtask={handleAddSubtask}
        onToggleSubtask={handleToggleSubtask}
        onDeleteSubtask={handleDeleteSubtask}
        userId={userId}
        comments={comments.filter((c) => editingTask && c.task_id === editingTask.id)}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        projectLabels={projectLabels}
      />

      {isMembersDrawerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in" onClick={() => {
          setIsMembersDrawerOpen(false);
          setIsAddingMemberMobile(false);
        }}>
          <div 
            className="w-full max-h-[85vh] bg-zinc-950/95 border-t border-zinc-800/80 rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl backdrop-blur-xl animate-slide-up text-zinc-100 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-brand-accent" />
                <h3 className="text-sm font-bold text-white">Membros do Projeto</h3>
              </div>
              <button 
                onClick={() => {
                  setIsMembersDrawerOpen(false);
                  setIsAddingMemberMobile(false);
                }}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-all text-xs font-semibold"
              >
                Fechar
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 no-scrollbar">
              
              {/* Form de Adicionar Membros */}
              {!isAddingMemberMobile ? (
                <button
                  onClick={() => setIsAddingMemberMobile(true)}
                  className="w-full py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white border border-brand-accent/40 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-accent/10 active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Plus size={14} />
                  Adicionar Novo Participante
                </button>
              ) : (
                <div className="p-3.5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex flex-col gap-3 animate-slide-in shrink-0">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Selecione o Usuário</span>
                  {(() => {
                    // Encontrar perfis que NÃO fazem parte do projeto ainda
                    const availableProfiles = allProfiles.filter(
                      (p) => !projectMembers.some((m) => m.id === p.id)
                    );

                    if (availableProfiles.length === 0) {
                      return (
                        <div className="text-[10px] text-zinc-500 py-1 flex flex-col gap-2">
                          <span>Todos os usuários já participam deste projeto!</span>
                          <button
                            onClick={() => setIsAddingMemberMobile(false)}
                            className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold transition-all border border-zinc-700/30"
                          >
                            Voltar
                          </button>
                        </div>
                      );
                    }

                    return (
                      <>
                        <select
                          value={selectedMemberEmailMobile}
                          onChange={(e) => setSelectedMemberEmailMobile(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-brand-accent cursor-pointer"
                        >
                          <option value="">-- Escolha um usuário --</option>
                          {availableProfiles.map((p) => (
                            <option key={p.id} value={p.email}>
                              {p.full_name} ({p.email})
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (selectedMemberEmailMobile) {
                                const success = await onAddProjectMember(selectedMemberEmailMobile);
                                if (success) {
                                  setIsAddingMemberMobile(false);
                                  setSelectedMemberEmailMobile('');
                                  toast('Membro adicionado com sucesso!', 'success');
                                }
                              } else {
                                toast('Selecione um usuário para adicionar!', 'info');
                              }
                            }}
                            className="flex-1 py-2 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold transition-all active:scale-95"
                          >
                            Adicionar
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingMemberMobile(false);
                              setSelectedMemberEmailMobile('');
                            }}
                            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all active:scale-95 border border-zinc-700/30"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Lista de Participantes & Filtro */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                  Participantes (Toque para filtrar as tarefas)
                </span>
                {projectMembers.length === 0 ? (
                  <div className="text-center py-4 text-xs text-zinc-500">
                    Nenhum participante adicionado.
                  </div>
                ) : (
                  projectMembers.map((member) => {
                    const isFiltered = filterAssigneeId === member.id;
                    return (
                      <div
                        key={member.id}
                        onClick={() => {
                          if (isFiltered) {
                            setFilterAssigneeId('');
                          } else {
                            setFilterAssigneeId(member.id);
                          }
                        }}
                        className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                          isFiltered
                            ? 'bg-brand-accent/20 border-brand-accent/50 text-white shadow-lg shadow-brand-accent/10'
                            : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold uppercase transition-all shrink-0 select-none overflow-hidden ${
                            isFiltered
                              ? 'bg-brand-accent text-white'
                              : 'bg-brand-accent/10 border border-brand-accent/20 text-brand-accent'
                          }`}>
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                            ) : member.avatar_emoji ? (
                              member.avatar_emoji
                            ) : (
                              member.full_name ? member.full_name[0] : 'U'
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate leading-tight">
                              {member.full_name}
                            </span>
                            <span className="text-[10px] text-zinc-500 truncate leading-none mt-1">
                              {member.role === 'owner' ? 'Dono do Projeto' : 'Colaborador'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {isFiltered && (
                            <span className="px-2 py-0.5 rounded bg-brand-accent/30 border border-brand-accent/40 text-[9px] text-brand-accent font-bold animate-pulse">
                              Filtrando
                            </span>
                          )}
                          {member.role !== 'owner' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation(); // Evitar disparar o filtro ao deletar!
                                const isConfirmed = await confirm(`Deseja realmente remover ${member.full_name} do projeto?`);
                                if (isConfirmed) {
                                  await onRemoveProjectMember(member.id);
                                  toast('Membro removido com sucesso!', 'success');
                                }
                              }}
                              title="Remover do Projeto"
                              className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all border border-transparent hover:border-red-900/50"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
