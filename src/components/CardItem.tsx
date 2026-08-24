import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, AlignLeft, User, Eye, CheckSquare, Paperclip } from 'lucide-react';
import { getLabelClasses, getPriorityClasses, getPriorityLabel } from '../lib/colors';
import { truncateText } from '../lib/text';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_emoji?: string;
  avatar_url?: string;
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
  assignee_id?: string;
}

interface CardItemProps {
  task: Task;
  index: number;
  profiles: Profile[];
  subtasks: Subtask[];
  onCardClick: (task: Task) => void;
  isBulkMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (taskId: string) => void;
}

export const CardItem: React.FC<CardItemProps> = ({
  task,
  index,
  profiles,
  subtasks,
  onCardClick,
  isBulkMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const assignee = profiles.find((p) => p.id === task.assignee_id);

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
    const now = new Date();
    const dueDate = new Date(dateStr);
    return dueDate < now;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const imageAttachment = task.attachments?.find(
    (att) => att.type === 'image' || att.name.match(/\.(jpeg|jpg|gif|png)$/i)
  );

  const totalSub = subtasks.length;
  const completedSub = subtasks.filter((s) => s.is_completed).length;
  const progressPercent = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => {
            if (isBulkMode && onToggleSelect) {
              onToggleSelect(task.id);
            } else {
              onCardClick(task);
            }
          }}
          className={`p-4 mb-3 rounded-xl transition-all duration-200 group cursor-pointer select-none active:scale-[0.99] overflow-hidden border ${
            isSelected
              ? 'bg-indigo-950/30 border-indigo-500 shadow-md shadow-indigo-500/10'
              : 'bg-zinc-900/90 border-zinc-800/80 hover:border-brand-accent/50 hover:bg-zinc-900'
          } ${snapshot.isDragging ? 'dragging-card' : ''}`}
        >
          {/* Cover image if task contains image attachments */}
          {imageAttachment && (
            <div className="-mx-4 -mt-4 mb-3 max-h-32 overflow-hidden border-b border-zinc-800/85 bg-zinc-950">
              <img
                src={imageAttachment.url}
                alt="Card Cover"
                className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300 max-h-28"
              />
            </div>
          )}

          {/* Custom Tag Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {task.labels.map((lbl, idx) => (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 rounded text-3xs font-extrabold uppercase tracking-wide border ${getLabelClasses(
                    lbl.color
                  )}`}
                >
                  {lbl.name}
                </span>
              ))}
            </div>
          )}

          {/* Card Header Tags & Checkbox */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              {(isBulkMode || isSelected) && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (onToggleSelect) onToggleSelect(task.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-zinc-950 cursor-pointer h-4 w-4 shrink-0"
                />
              )}
              <span
                className={`text-2xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${getPriorityClasses(
                  task.priority
                )}`}
              >
                {getPriorityLabel(task.priority)}
              </span>
            </div>
            <div aria-hidden="true" className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500">
              <Eye size={14} className="hover:text-brand-accent" />
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-white group-hover:text-brand-accent transition-colors mb-1.5 line-clamp-2">
            {task.title}
          </h4>

          {/* Description Snippet Indicator */}
          {task.description && (
            <p className="text-xs text-zinc-400 line-clamp-2 mb-3.5 flex items-start gap-1 font-light leading-relaxed">
              <AlignLeft size={12} className="shrink-0 mt-0.5 text-zinc-500" />
              <span>{truncateText(task.description)}</span>
            </p>
          )}

          {/* Badges indicators: Checklist & Attachments */}
          {(totalSub > 0 || (task.attachments && task.attachments.length > 0)) && (
            <div className="flex flex-col gap-2.5 mb-3.5">
              <div className="flex flex-wrap gap-2">
                {/* Checklist progress */}
                {totalSub > 0 && (
                  <div
                    title="Progresso do checklist"
                    className={`flex items-center gap-1 text-3xs font-extrabold px-2 py-0.5 rounded border transition-colors ${
                      completedSub === totalSub
                        ? 'text-emerald-400 bg-emerald-950/20 border-emerald-800/20'
                        : 'text-zinc-400 bg-zinc-950/40 border-zinc-900/60'
                    }`}
                  >
                    <CheckSquare size={10} className="shrink-0" />
                    <span>
                      {completedSub}/{totalSub}
                    </span>
                  </div>
                )}

                {/* Attachments counter */}
                {task.attachments && task.attachments.length > 0 && (
                  <div
                    title="Documentos anexados"
                    className="flex items-center gap-1 text-3xs font-extrabold text-zinc-400 bg-zinc-950/40 border border-zinc-900/60 px-2 py-0.5 rounded shrink-0"
                  >
                    <Paperclip size={10} className="shrink-0" />
                    <span>{task.attachments.length}</span>
                  </div>
                )}
              </div>

              {/* Checklist progress bar */}
              {totalSub > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-3xs font-bold text-zinc-500">
                    <span>Progresso do checklist</span>
                    <span className={completedSub === totalSub ? 'text-emerald-400 font-extrabold' : ''}>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-zinc-900/50">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        completedSub === totalSub ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'bg-brand-accent'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card Footer Info */}
          <div className="flex items-center justify-between border-t border-zinc-800/50 pt-3 mt-1.5 text-xs text-zinc-500">
            {/* Due Date */}
            {task.due_date ? (
              <div
                className={`flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-md border ${
                  isOverdue(task.due_date) && task.priority !== 'low'
                    ? 'text-red-400 bg-red-950/20 border-red-800/20'
                    : 'text-zinc-400 bg-zinc-950/40 border-zinc-900'
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
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500/80 to-purple-600/80 text-white flex items-center justify-center font-bold text-3xs border border-zinc-800/80 overflow-hidden select-none">
                  {assignee.avatar_url ? (
                    <img src={assignee.avatar_url} alt={assignee.full_name} className="w-full h-full object-cover" />
                  ) : assignee.avatar_emoji ? (
                    assignee.avatar_emoji
                  ) : (
                    getInitials(assignee.full_name)
                  )}
                </div>
              </div>
            ) : (
              <div
                title="Sem responsável"
                className="w-6 h-6 rounded-full border border-zinc-800/80 border-dashed flex items-center justify-center text-zinc-600 bg-zinc-950/20"
              >
                <User size={10} />
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
