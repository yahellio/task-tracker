import { TaskCriteria } from '../../application/dto/TaskCriteria.js';
import { TaskForm } from '../../application/dto/TaskForm.js';
import { NotFoundError, ValidationError } from '../../domain/errors.js';
import { takeUploads } from '../middleware/uploads.js';
import { FilterPresenter } from '../presenters/FilterPresenter.js';
import { TaskPresenter } from '../presenters/TaskPresenter.js';
import { safeRedirectTarget } from '../support/redirect.js';

const TASKS_PATH = '/tasks';

export class TaskController {
  #service;

  constructor({ taskService }) {
    this.#service = taskService;
  }

  index = async (req, res) => {
    const criteria = TaskCriteria.fromQuery(req.query);
    const { tasks, summary } = await this.#service.getOverview(criteria);
    const today = this.#service.today();

    res.render('pages/tasks/index', {
      pageTitle: 'Задачи',
      tasks: TaskPresenter.toList(tasks, today),
      filters: FilterPresenter.toView(criteria, summary),
      countLabel: TaskPresenter.countLabel(tasks.length),
      returnTo: `${TASKS_PATH}${criteria.toQueryString()}`
    });
  };

  newForm = async (req, res) => {
    res.render('pages/tasks/new', {
      pageTitle: 'Новая задача',
      form: TaskForm.empty(),
      errors: {},
      statusOptions: TaskPresenter.statusOptions(),
      returnTo: safeRedirectTarget(req.query.returnTo, TASKS_PATH)
    });
  };

  create = async (req, res) => {
    const returnTo = safeRedirectTarget(req.body.returnTo, TASKS_PATH);
    try {
      const input = TaskForm.parse(req.body);
      const task = await this.#service.create(input, takeUploads(req));
      res.redirect(`${TASKS_PATH}/${task.id}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw error;
      }
      res.status(error.status).render('pages/tasks/new', {
        pageTitle: 'Новая задача',
        form: TaskForm.raw(req.body),
        errors: error.fieldErrors,
        statusOptions: TaskPresenter.statusOptions(),
        returnTo
      });
    }
  };

  show = async (req, res) => {
    const task = await this.#service.getById(req.params.id);
    res.render('pages/tasks/show', {
      pageTitle: task.title,
      task: TaskPresenter.toView(task, this.#service.today()),
      statusOptions: TaskPresenter.statusOptions(),
      returnTo: safeRedirectTarget(req.query.returnTo, TASKS_PATH)
    });
  };

  editForm = async (req, res) => {
    const task = await this.#service.getById(req.params.id);
    res.render('pages/tasks/edit', {
      pageTitle: `Редактирование: ${task.title}`,
      taskId: task.id,
      form: TaskPresenter.toForm(task),
      errors: {},
      statusOptions: TaskPresenter.statusOptions(),
      returnTo: safeRedirectTarget(req.query.returnTo, TASKS_PATH)
    });
  };

  update = async (req, res) => {
    const returnTo = safeRedirectTarget(req.body.returnTo, TASKS_PATH);
    try {
      const input = TaskForm.parse(req.body);
      const task = await this.#service.update(req.params.id, input);
      res.redirect(`${TASKS_PATH}/${task.id}`);
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw error;
      }
      res.status(error.status).render('pages/tasks/edit', {
        pageTitle: 'Редактирование задачи',
        taskId: req.params.id,
        form: TaskForm.raw(req.body),
        errors: error.fieldErrors,
        statusOptions: TaskPresenter.statusOptions(),
        returnTo
      });
    }
  };

  changeStatus = async (req, res) => {
    await this.#service.changeStatus(req.params.id, req.body.status);
    res.redirect(safeRedirectTarget(req.body.returnTo, TASKS_PATH));
  };

  destroy = async (req, res) => {
    await this.#service.remove(req.params.id);
    res.redirect(safeRedirectTarget(req.body.returnTo, TASKS_PATH));
  };

  addAttachments = async (req, res) => {
    await this.#service.addAttachments(req.params.id, takeUploads(req));
    res.redirect(`${TASKS_PATH}/${req.params.id}`);
  };

  removeAttachment = async (req, res) => {
    await this.#service.removeAttachment(req.params.id, req.params.attachmentId);
    res.redirect(`${TASKS_PATH}/${req.params.id}`);
  };

  downloadAttachment = async (req, res) => {
    const { attachment, path } = await this.#service.locateAttachment(req.params.id, req.params.attachmentId);
    await new Promise((resolve, reject) => {
      res.download(path, attachment.originalName, (error) => {
        if (error) {
          reject(res.headersSent ? error : new NotFoundError('Файл вложения не найден'));
          return;
        }
        resolve();
      });
    });
  };
}
