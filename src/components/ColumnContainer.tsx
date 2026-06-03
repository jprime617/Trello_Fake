import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { CardItem } from './CardItem';
import { Plus, Trash2, Edit2, FolderPlus } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
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

interface Column {
  id: string;
  title: string;
  position: number;
  board_id: string;
}

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
}

interface ColumnContainerProps {
  column: Column;
  tasks: Task[];
  profiles: Profile[];
  subtasks: Subtask[];
  onCardClick: (task: Task) => void;
  onAddTaskClick: (columnId: string) => void;
  onEditColumnClick: (column: Column) => void;
  onDeleteColumnClick: (columnId: string) => void;
  dragHandleProps?: any;
}

export const ColumnContainer: React.FC<ColumnContainerProps> = ({
  column,
  tasks,
  profiles,
  subtasks,
  onCardClick,
  onAddTaskClick,
  onEditColumnClick,
  onDeleteColumnClick,
  dragHandleProps,
}) => {
  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);

  return (
    <div className="w-[300px] shrink-0 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl flex flex-col h-full max-h-full overflow-hidden shadow-xl snap-center relative">
      {/* Column Header */}
      <div
        {...dragHandleProps}
        className="p-4 border-b border-zinc-800/80 flex items-center justify-between gap-3 bg-zinc-950/80 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-white truncate text-sm">
            {column.title}
          </h3>
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">
            {sortedTasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onEditColumnClick(column)}
            title="Editar Título"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-zinc-900 transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDeleteColumnClick(column.id)}
            title="Excluir Coluna"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Task List Droppable Area */}
      <Droppable droppableId={column.id} type="task">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto px-3 py-4 transition-all no-scrollbar ${
              snapshot.isDraggingOver ? 'bg-indigo-950/10' : ''
            }`}
            style={{ minHeight: '100px' }}
          >
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task, index) => (
                <CardItem
                  key={task.id}
                  task={task}
                  index={index}
                  profiles={profiles}
                  subtasks={subtasks.filter((s) => s.task_id === task.id)}
                  onCardClick={onCardClick as any}
                />
              ))
            ) : (
              <div className="h-28 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-600 text-xs gap-1.5 select-none bg-zinc-950/10">
                <FolderPlus size={16} />
                <span>Nenhuma tarefa aqui</span>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add Task Button at bottom of column */}
      <div className="p-3 bg-zinc-950/60 border-t border-zinc-800/80">
        <button
          onClick={() => onAddTaskClick(column.id)}
          className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700/80 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <Plus size={14} />
          <span>Adicionar tarefa</span>
        </button>
      </div>
    </div>
  );
};
