import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, ACTIONS, STATUSES, PROJECTS, parseManualTime } from '../constants';

const CATEGORY_KEYS = Object.keys(CATEGORIES);
const ACTION_KEYS   = Object.keys(ACTIONS);
const STATUS_KEYS   = Object.keys(STATUSES);

function durationToString(secs) {
  if (!secs) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}:${String(m).padStart(2, '00')}`;
}

export default function EditModal({ entry, onSave, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    category:    entry.category,
    action:      entry.action,
    status:      entry.status,
    project:     entry.project || '',
    description: entry.description || '',
    manualTime:  durationToString(entry.duration),
  });
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(entry.id, {
        category:    form.category,
        action:      form.action,
        status:      form.status,
        project:     form.project,
        description: form.description,
        duration:    parseManualTime(form.manualTime),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-title">{t('entry.editTitle')} {entry.task_number}</div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>{t('form.project')}</label>
            <select value={form.project} onChange={e => set('project', e.target.value)}>
              <option value="">{t('form.noProject')}</option>
              {PROJECTS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t('form.category')}</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORY_KEYS.map(k => (
                <option key={k} value={k}>{CATEGORIES[k].emoji} {t(`categories.${k}`, CATEGORIES[k].label)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t('form.action')}</label>
            <select value={form.action} onChange={e => set('action', e.target.value)}>
              {ACTION_KEYS.map(k => (
                <option key={k} value={k}>{t(`actions.${k}`, ACTIONS[k])}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t('form.status')}</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_KEYS.map(k => (
                <option key={k} value={k}>{STATUSES[k].emoji} {t(`statuses.${k}`, STATUSES[k].label)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t('form.description')}</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>{t('form.durationShort')}</label>
            <input
              type="text"
              value={form.manualTime}
              onChange={e => set('manualTime', e.target.value)}
              placeholder={t('form.durationPlaceholder')}
            />
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? t('entry.saving') : t('entry.save')}
            </button>
            <button className="btn btn-ghost" type="button" onClick={onClose}>
              {t('entry.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
