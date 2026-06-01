import React, { useState, useEffect } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { supabase } from '../lib/supabase';
import { ColumnContainer } from './ColumnContainer';
import { CardModal } from './CardModal';
import { ColumnModal } from './ColumnModal';
import { Kanban, Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Column {
  id: string;
  title: string;
  position: number;
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
}

interface BoardProps {
  isColumnModalOpen: boolean;
  setIsColumnModalOpen: (val: boolean) => void;
  isCardModalOpen: boolean;
  setIsCardModalOpen: (val: boolean) => void;
  selectedColumnId: string | undefined;
  setSelectedColumnId: (id: string | undefined) => void;
}

export const Board: React.FC<BoardProps> = ({
  isColumnModalOpen,
  setIsColumnModalOpen,
  isCardModalOpen,
  setIsCardModalOpen,
  selectedColumnId,
  setSelectedColumnId,
}) => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // 1. Carregar todos os dados iniciais
  const fetchData = async () => {
    try {
      setLoading(true);

      // Carregar Perfis
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*');
      if (profileErr) throw profileErr;
      setProfiles(profileData || []);

      // Carregar Colunas
      const { data: columnData, error: columnErr } = await supabase
        .from('columns')
        .select('*')
        .order('position', { ascending: true });
      if (columnErr) throw columnErr;
      setColumns(columnData || []);

      // Carregar Tarefas
      const { data: taskData, error: taskErr } = await supabase
        .from('tasks')
        .select('*')
        .order('position', { ascending: true });
      if (taskErr) throw taskErr;
      setTasks(taskData || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 2. Configurar o Supabase Realtime para sincronização em tempo real
    const columnsSubscription = supabase
      .channel('columns-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'columns' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCol = payload.new as Column;
            setColumns((prev) => {
              if (prev.some((c) => c.id === newCol.id)) return prev;
              return [...prev, newCol].sort((a, b) => a.position - b.position);
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedCol = payload.new as Column;
            setColumns((prev) =>
              prev
                .map((c) => (c.id === updatedCol.id ? updatedCol : c))
                .sort((a, b) => a.position - b.position)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedCol = payload.old as { id: string };
            setColumns((prev) => prev.filter((c) => c.id !== deletedCol.id));
          }
        }
      )
      .subscribe();

    const tasksSubscription = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            setTasks((prev) => {
              if (prev.some((t) => t.id === newTask.id)) return prev;
              return [...prev, newTask].sort((a, b) => a.position - b.position);
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setTasks((prev) =>
              prev
                .map((t) => (t.id === updatedTask.id ? updatedTask : t))
                .sort((a, b) => a.position - b.position)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedTask = payload.old as { id: string };
            setTasks((prev) => prev.filter((t) => t.id !== deletedTask.id));
          }
        }
      )
      .subscribe();

    // Limpar inscrições do Realtime ao desmontar componente
    return () => {
      supabase.removeChannel(columnsSubscription);
      supabase.removeChannel(tasksSubscription);
    };
  }, []);

  // 3. Lógica do Drag and Drop
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    // Se dropou fora de uma área válida ou no mesmo lugar de origem
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === 'task') {
      const sourceColId = source.droppableId;
      const destColId = destination.droppableId;

      // Pegar todas as tarefas ativas ordenadas
      const columnTasks = tasks.filter((t) => t.column_id === destColId).sort((a, b) => a.position - b.position);
      const sourceTasks = tasks.filter((t) => t.column_id === sourceColId).sort((a, b) => a.position - b.position);

      const draggedTask = tasks.find((t) => t.id === draggableId);
      if (!draggedTask) return;

      // Criar nova lista de tarefas com atualizações otimistas
      let updatedTasks = [...tasks];

      if (sourceColId === destColId) {
        // Movimentação na mesma coluna
        const reordered = [...columnTasks];
        const [removed] = reordered.splice(source.index, 1);
        reordered.splice(destination.index, 0, removed);

        // Atualizar as posições locais de todas daquela coluna
        const newPositions = reordered.map((t, idx) => ({
          ...t,
          position: idx + 1,
        }));

        updatedTasks = updatedTasks.map((t) => {
          const found = newPositions.find((np) => np.id === t.id);
          return found ? found : t;
        });

        setTasks(updatedTasks);

        // Enviar alterações para o Supabase
        for (const taskItem of newPositions) {
          await supabase
            .from('tasks')
            .update({ position: taskItem.position })
            .eq('id', taskItem.id);
        }
      } else {
        // Movimentação entre colunas diferentes
        const sourceReordered = [...sourceTasks];
        const [removed] = sourceReordered.splice(source.index, 1);
        
        // Mudar o id da coluna do card arrastado
        const updatedDraggedTask = { ...removed, column_id: destColId };
        
        const destReordered = [...columnTasks];
        destReordered.splice(destination.index, 0, updatedDraggedTask);

        // Recalcular posições na coluna de origem
        const newSourcePositions = sourceReordered.map((t, idx) => ({
          ...t,
          position: idx + 1,
        }));

        // Recalcular posições na coluna de destino
        const newDestPositions = destReordered.map((t, idx) => ({
          ...t,
          position: idx + 1,
        }));

        // Fundir dados locais de forma otimista
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

        // Enviar atualizações ao Supabase
        // Atualizar coluna e posição do card arrastado
        await supabase
          .from('tasks')
          .update({ column_id: destColId, position: destination.index + 1 })
          .eq('id', draggableId);

        // Atualizar posições do restante da coluna de origem
        for (const taskItem of newSourcePositions) {
          await supabase
            .from('tasks')
            .update({ position: taskItem.position })
            .eq('id', taskItem.id);
        }

        // Atualizar posições do restante da coluna de destino
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

  // 4. Salvar/Criar Coluna
  const handleSaveColumn = async (title: string) => {
    try {
      if (editingColumn) {
        // Atualizar Coluna Existente
        const { error } = await supabase
          .from('columns')
          .update({ title })
          .eq('id', editingColumn.id);
        if (error) throw error;
      } else {
        // Criar Nova Coluna
        const nextPosition = columns.length > 0 ? Math.max(...columns.map((c) => c.position)) + 1 : 1;
        const { error } = await supabase
          .from('columns')
          .insert({ title, position: nextPosition });
        if (error) throw error;
      }
    } catch (err: any) {
      alert('Erro ao salvar coluna: ' + err.message);
    } finally {
      setEditingColumn(null);
    }
  };

  // 5. Excluir Coluna
  const handleDeleteColumn = async (columnId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta coluna e todos os seus cartões de tarefas?')) {
      try {
        const { error } = await supabase.from('columns').delete().eq('id', columnId);
        if (error) throw error;
      } catch (err: any) {
        alert('Erro ao excluir coluna: ' + err.message);
      }
    }
  };

  // 6. Salvar/Criar Cartão de Tarefa
  const handleSaveCard = async (cardData: any) => {
    try {
      if (editingTask) {
        // Editar cartão de tarefa
        const { error } = await supabase
          .from('tasks')
          .update({
            title: cardData.title,
            description: cardData.description,
            assignee_id: cardData.assignee_id,
            due_date: cardData.due_date,
            priority: cardData.priority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTask.id);
        if (error) throw error;
      } else {
        // Criar novo cartão
        const colId = cardData.column_id || selectedColumnId || columns[0]?.id;
        if (!colId) throw new Error('Selecione uma coluna válida para inserir a tarefa.');

        const colTasks = tasks.filter((t) => t.column_id === colId);
        const nextPosition = colTasks.length > 0 ? Math.max(...colTasks.map((t) => t.position)) + 1 : 1;

        const { error } = await supabase.from('tasks').insert({
          column_id: colId,
          title: cardData.title,
          description: cardData.description,
          assignee_id: cardData.assignee_id,
          due_date: cardData.due_date,
          priority: cardData.priority,
          position: nextPosition,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      alert('Erro ao salvar tarefa: ' + err.message);
    } finally {
      setEditingTask(null);
      setSelectedColumnId(undefined);
    }
  };

  // 7. Excluir Cartão de Tarefa
  const handleDeleteCard = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (err: any) {
      alert('Erro ao excluir tarefa: ' + err.message);
    } finally {
      setEditingTask(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-brand-bg relative pb-16 lg:pb-0 h-screen overflow-hidden">
      {/* Top Header Panel */}
      <header className="h-16 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-950/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Kanban size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight my-0">
              Quadro de Colaboração
            </h2>
            <p className="text-[10px] text-zinc-500 font-semibold tracking-wide flex items-center gap-1 mt-0.5">
              <Sparkles size={10} className="text-yellow-500/80" />
              <span>Sincronização em tempo real ativa</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            title="Recarregar Quadro"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800/50 transition-all active:rotate-45 shrink-0"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setIsColumnModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98] shrink-0"
          >
            Adicionar Coluna
          </button>
        </div>
      </header>

      {/* Board Columns container */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-6 snap-x snap-mandatory scroll-smooth">
        {loading ? (
          <div className="w-full h-[60vh] flex flex-col items-center justify-center text-zinc-500 gap-3">
            <Loader2 className="animate-spin text-brand-accent" size={32} />
            <span className="text-xs font-semibold tracking-wider">Carregando painel do grupo...</span>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-5 h-full items-start pb-4">
              {columns.length > 0 ? (
                columns.map((column) => (
                  <ColumnContainer
                    key={column.id}
                    column={column}
                    tasks={tasks.filter((t) => t.column_id === column.id)}
                    profiles={profiles}
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
                  />
                ))
              ) : (
                <div className="w-full h-[55vh] border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 text-sm gap-3">
                  <Kanban size={32} className="text-zinc-700" />
                  <div className="text-center">
                    <h3 className="font-semibold text-white mb-1">Nenhuma coluna ativa</h3>
                    <p className="text-xs text-zinc-500">Crie colunas para começar a organizar as tarefas do grupo</p>
                  </div>
                  <button
                    onClick={() => setIsColumnModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
                  >
                    Criar primeira coluna
                  </button>
                </div>
              )}
            </div>
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
      />
    </div>
  );
};
