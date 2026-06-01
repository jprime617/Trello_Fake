import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, AlignLeft, User, Eye } from 'lucide-react';

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
}

interface CardItemProps {
  task: Task;
  index: number;
  profiles: Profile[];
  onCardClick: (task: Task) => void;
}

export const CardItem: React.FC<CardItemProps> = ({
  task,
  index,
  profiles,
  onCardClick,
}) => {
  const assignee = profiles.find((p) => p.id === task.assignee_id);

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border border-red-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'low':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
      default:
        return 'Baixa';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr + 'T00:00:00');
    return dueDate < today;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year.substring(2)}`;
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onCardClick(task)}
          className={`p-4 mb-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl transition-all duration-200 hover:border-indigo-500/50 hover:bg-zinc-900 group cursor-pointer select-none active:scale-[0.99] ${
            snapshot.isDragging ? 'dragging-card' : ''
          }`}
        >
          {/* Card Header Tags */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getPriorityStyles(
                task.priority
              )}`}
            >
              {getPriorityLabel(task.priority)}
            </span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500">
              <Eye size={14} className="hover:text-indigo-400" />
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors mb-1.5 line-clamp-2">
            {task.title}
          </h4>

          {/* Description Snippet Indicator */}
          {task.description && (
            <p className="text-xs text-zinc-400 line-clamp-2 mb-3.5 flex items-start gap-1 font-light leading-relaxed">
              <AlignLeft size={12} className="shrink-0 mt-0.5 text-zinc-500" />
              <span>{task.description}</span>
            </p>
          )}

          {/* Card Footer Info */}
          <div className="flex items-center justify-between border-t border-zinc-800/50 pt-3 mt-1.5 text-xs text-zinc-500">
            {/* Due Date */}
            {task.due_date ? (
              <div
                className={`flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-md ${
                  isOverdue(task.due_date) && task.priority !== 'low'
                    ? 'text-red-400 bg-red-950/20 border border-red-800/20'
                    : 'text-zinc-400 bg-zinc-950/40 border border-zinc-900'
                }`}
              >
                <Calendar size={12} />
                <span>{formatDate(task.due_date)}</span>
              </div>
            ) : (
              <div className="w-1" />
            )}

            {/* Assignee Avatar */}
            {assignee ? (
              <div
                title={assignee.full_name}
                className="flex items-center gap-1.5 shrink-0"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500/80 to-purple-600/80 text-white flex items-center justify-center font-bold text-[9px] border border-zinc-800/80">
                  {getInitials(assignee.full_name)}
                </div>
              </div>
            ) : (
              <div title="Sem responsável" className="w-6 h-6 rounded-full border border-zinc-800/80 border-dashed flex items-center justify-center text-zinc-600 bg-zinc-950/20">
                <User size={10} />
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
