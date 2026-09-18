import { Link } from 'react-router-dom';
import { formatDate, QUICK_ACTIONS, STATUS_META } from '../lib.js';
import { OverdueBadge, StatusBadge } from './ui.jsx';

export const TaskCard = ({ task, busy, onChangeStatus, onRemove }) => (
  <li className={`task task--${STATUS_META[task.status].modifier}`}>
    <div className="task__main">
      <Link className="task__title" to={`/tasks/${task.id}`}>
        {task.title}
      </Link>
      <div className="task__meta">
        <StatusBadge status={task.status} />
        <span className={`task__meta-item${task.isOverdue ? ' task__meta-item--overdue' : ''}`}>
          {task.dueDate ? `Срок: ${formatDate(task.dueDate)}` : 'Без срока'}
        </span>
        {task.isOverdue && <OverdueBadge />}
        {task.attachments.length > 0 && <span className="task__meta-item">Вложений: {task.attachments.length}</span>}
      </div>
    </div>

    <div className="task__actions">
      <div className="button-row">
        {QUICK_ACTIONS[task.status].map((action) => (
          <button
            key={action.value}
            className={`button button--small button--status-${STATUS_META[action.value].modifier}`}
            type="button"
            disabled={busy}
            onClick={() => onChangeStatus(task, action.value)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <span className="task__actions-divider" />
      <Link className="button button--small button--quiet" to={`/tasks/${task.id}/edit`}>
        Изменить
      </Link>
      <button className="button button--small button--danger" type="button" disabled={busy} onClick={() => onRemove(task)}>
        Удалить
      </button>
    </div>
  </li>
);
