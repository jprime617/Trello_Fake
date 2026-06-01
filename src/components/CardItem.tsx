import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, AlignLeft, User, Eye, CheckSquare, Paperclip } from 'lucide-react';

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

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
}

interface CardItemProps {
  task: Task;
  index: number;
  profiles: Profile[];
  subtasks: Subtask[];
  onCardClick: (task: Task) => void;
}

export const CardItem: React.FC<CardItemProps> = ({
  task,
  index,
  profiles,
  subtasks,
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

  const getLabelStyles = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-500/15 text-red-400 border border-red-500/30';
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'amber':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'blue':
        return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      case 'purple':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      case 'pink':
        return 'bg-pink-500/15 text-pink-400 border border-pink-500/30';
      case 'indigo':
      default:
        return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30';
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

  // Encontrar o primeiro anexo de imagem para usar como capa do cartão
  const imageAttachment = task.attachments?.find(
    (att) => att.type === 'image' || att.name.match(/\.(jpeg|jpg|gif|png)$/i)
  );

  // Calcular progresso do checklist
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
          onClick={() => onCardClick(task)}
          className={`p-4 mb-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl transition-all duration-200 hover:border-indigo-500/50 hover:bg-zinc-900 group cursor-pointer select-none active:scale-[0.99] overflow-hidden ${
            snapshot.isDragging ? 'dragging-card' : ''
          }`}
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
                  className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border ${getLabelStyles(
                    lbl.color
                  )}`}
                >
                  {lbl.name}
                </span>
              ))}
            </div>
          )}

          {/* Card Header Tags */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${getPriorityStyles(
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

          {/* Badges indicators: Checklist & Attachments */}
          {(totalSub > 0 || (task.attachments && task.attachments.length > 0)) && (
            <div className="flex flex-col gap-2.5 mb-3.5">
              <div className="flex flex-wrap gap-2">
                {/* Checklist progress */}
                {totalSub > 0 && (
                  <div
                    title="Progresso do checklist"
                    className={`flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded border transition-colors ${
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
                    className="flex items-center gap-1 text-[9px] font-extrabold text-zinc-400 bg-zinc-950/40 border border-zinc-900/60 px-2 py-0.5 rounded shrink-0"
                  >
                    <Paperclip size={10} className="shrink-0" />
                    <span>{task.attachments.length}</span>
                  </div>
                )}
              </div>

              {/* Checklist progress bar */}
              {totalSub > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[8px] font-bold text-zinc-500">
                    <span>Progresso do checklist</span>
                    <span className={completedSub === totalSub ? 'text-emerald-400 font-extrabold' : ''}>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-zinc-900/50">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        completedSub === totalSub ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'bg-indigo-500'
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
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500/80 to-purple-600/80 text-white flex items-center justify-center font-bold text-[9px] border border-zinc-800/80">
                  {getInitials(assignee.full_name)}
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
