'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Category = { id: string; name: string; active: boolean };
type Publication = { id: string; categoryId: string; code: string; title: string; opening: number; active: boolean };
type Congregation = { id: string; name: string; status: 'Submitted' | 'In progress'; active: boolean };
type AdminData = { categories: Category[]; publications: Publication[]; congregations: Congregation[] };

type DialogState =
  | { kind: 'category'; mode: 'add' | 'edit'; item?: Category; name: string }
  | { kind: 'publication'; mode: 'add' | 'edit'; item?: Publication; categoryId: string; title: string; code: string }
  | { kind: 'congregation'; mode: 'add' | 'edit'; item?: Congregation; name: string }
  | { kind: 'delete-publication'; item: Publication }
  | { kind: 'delete-congregation'; item: Congregation }
  | null;

const STORAGE_KEY = 'lms-admin-v3';

function readAdminData(): AdminData | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as AdminData) : null;
  } catch {
    return null;
  }
}

function saveAdminData(data: AdminData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.location.reload();
}

function singularCategory(name: string) {
  const normalized = name.trim();
  const labels: Record<string, string> = {
    Bibles: 'Bible',
    Books: 'book',
    'Brochures and Booklets': 'brochure or booklet',
    Tracts: 'tract',
    'Public Magazines': 'public magazine',
    'Study Watchtower': 'Study Watchtower',
    'Meeting Workbooks': 'meeting workbook',
    'Examining the Scriptures Daily': 'daily text',
    'Forms and Supplies': 'form or supply',
  };
  return labels[normalized] || normalized.replace(/s$/i, '') || 'publication';
}

function pageHeading() {
  return document.querySelector<HTMLElement>('.topbar h1')?.textContent?.trim() || '';
}

function articleForButton(button: HTMLElement) {
  return button.closest('article');
}

export default function AdminDialogController() {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [error, setError] = useState('');

  const adminData = useMemo(() => (typeof window === 'undefined' ? null : readAdminData()), [dialog]);
  const categories = adminData?.categories || [];

  useEffect(() => {
    const updateContextButton = () => {
      if (pageHeading() !== 'Publications') return;
      const panel = Array.from(document.querySelectorAll<HTMLElement>('.panel')).find(item =>
        item.querySelector('h2')?.textContent?.includes('Categories and publications'),
      );
      if (!panel) return;
      const categorySelect = panel.querySelector<HTMLSelectElement>('.publicationTools select');
      const addButton = Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).find(button =>
        /^(Add publication|Add .+)$/i.test(button.textContent?.trim() || '') &&
        !button.textContent?.includes('category'),
      );
      if (!categorySelect || !addButton) return;
      const selected = categories.find(category => category.id === categorySelect.value);
      addButton.textContent = selected ? `Add ${singularCategory(selected.name)}` : 'Add publication';
    };

    updateContextButton();
    const observer = new MutationObserver(updateContextButton);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('change', updateContextButton, true);

    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button) return;
      const label = button.textContent?.trim() || '';
      const heading = pageHeading();
      const data = readAdminData();
      if (!data) return;

      const stop = () => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setError('');
      };

      if (heading === 'Publications' && label === 'Add category') {
        stop();
        setDialog({ kind: 'category', mode: 'add', name: '' });
        return;
      }

      if (heading === 'Publications' && /^Add (?!category)/i.test(label)) {
        stop();
        const select = document.querySelector<HTMLSelectElement>('.publicationTools select');
        const categoryId = select?.value && select.value !== 'all' ? select.value : data.categories.find(c => c.active)?.id || '';
        setDialog({ kind: 'publication', mode: 'add', categoryId, title: '', code: '' });
        return;
      }

      if (heading === 'Congregations' && label === 'Add congregation') {
        stop();
        setDialog({ kind: 'congregation', mode: 'add', name: '' });
        return;
      }

      const article = articleForButton(button);
      const title = article?.querySelector('strong')?.textContent?.trim() || '';

      if (label === 'Edit' && heading === 'Congregations') {
        const item = data.congregations.find(c => c.name === title);
        if (!item) return;
        stop();
        setDialog({ kind: 'congregation', mode: 'edit', item, name: item.name });
        return;
      }

      if (label === 'Edit' && heading === 'Publications') {
        const publication = data.publications.find(p => title.includes(p.title));
        if (publication) {
          stop();
          setDialog({ kind: 'publication', mode: 'edit', item: publication, categoryId: publication.categoryId, title: publication.title, code: publication.code });
          return;
        }
        const category = data.categories.find(c => c.name === title);
        if (category) {
          stop();
          setDialog({ kind: 'category', mode: 'edit', item: category, name: category.name });
        }
        return;
      }

      if (label === 'Delete' && heading === 'Congregations') {
        const item = data.congregations.find(c => c.name === title);
        if (!item) return;
        stop();
        setDialog({ kind: 'delete-congregation', item });
        return;
      }

      if (label === 'Delete' && heading === 'Publications') {
        const item = data.publications.find(p => title.includes(p.title));
        if (!item) return;
        stop();
        setDialog({ kind: 'delete-publication', item });
      }
    };

    document.addEventListener('click', onClick, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('change', updateContextButton, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [categories]);

  const close = () => {
    setDialog(null);
    setError('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!dialog) return;
    const data = readAdminData();
    if (!data) {
      setError('The administration data could not be loaded. Refresh and try again.');
      return;
    }

    if (dialog.kind === 'category') {
      const name = dialog.name.trim();
      if (!name) return setError('Enter a category name.');
      if (dialog.mode === 'add') data.categories.push({ id: crypto.randomUUID(), name, active: true });
      else data.categories = data.categories.map(item => item.id === dialog.item?.id ? { ...item, name } : item);
    }

    if (dialog.kind === 'publication') {
      const title = dialog.title.trim();
      if (!title) return setError('Enter a publication title.');
      if (!dialog.categoryId) return setError('Select a category.');
      if (dialog.mode === 'add') {
        data.publications.push({ id: crypto.randomUUID(), categoryId: dialog.categoryId, code: dialog.code.trim(), title, opening: 0, active: true });
      } else {
        data.publications = data.publications.map(item => item.id === dialog.item?.id ? { ...item, categoryId: dialog.categoryId, code: dialog.code.trim(), title } : item);
      }
    }

    if (dialog.kind === 'congregation') {
      const name = dialog.name.trim();
      if (!name) return setError('Enter a congregation name.');
      if (dialog.mode === 'add') data.congregations.push({ id: crypto.randomUUID(), name, status: 'In progress', active: true });
      else data.congregations = data.congregations.map(item => item.id === dialog.item?.id ? { ...item, name } : item);
    }

    if (dialog.kind === 'delete-publication') {
      data.publications = data.publications.filter(item => item.id !== dialog.item.id);
    }

    if (dialog.kind === 'delete-congregation') {
      data.congregations = data.congregations.filter(item => item.id !== dialog.item.id);
    }

    saveAdminData(data);
  };

  if (!dialog) return null;

  const publicationCategory = dialog.kind === 'publication' ? categories.find(c => c.id === dialog.categoryId) : null;
  const title = dialog.kind === 'publication'
    ? `${dialog.mode === 'add' ? 'Add' : 'Edit'} ${singularCategory(publicationCategory?.name || 'publication')}`
    : dialog.kind === 'category'
      ? `${dialog.mode === 'add' ? 'Add' : 'Edit'} category`
      : dialog.kind === 'congregation'
        ? `${dialog.mode === 'add' ? 'Add' : 'Edit'} congregation`
        : 'Confirm deletion';

  return (
    <div className="adminDialogBackdrop" onMouseDown={event => event.target === event.currentTarget && close()}>
      <form className="adminDialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
        <header>
          <div><span>Administration</span><h2 id="admin-dialog-title">{title}</h2></div>
          <button type="button" className="adminDialogClose" onClick={close} aria-label="Close">×</button>
        </header>

        {dialog.kind === 'category' && (
          <label><span>Category name</span><input autoFocus value={dialog.name} onChange={event => setDialog({ ...dialog, name: event.target.value })} placeholder="Enter category name" /></label>
        )}

        {dialog.kind === 'congregation' && (
          <label><span>Congregation name</span><input autoFocus value={dialog.name} onChange={event => setDialog({ ...dialog, name: event.target.value })} placeholder="Enter congregation name" /></label>
        )}

        {dialog.kind === 'publication' && (<>
          <label><span>Category</span><select value={dialog.categoryId} onChange={event => setDialog({ ...dialog, categoryId: event.target.value })}>{categories.filter(c => c.active).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label><span>Publication title</span><input autoFocus value={dialog.title} onChange={event => setDialog({ ...dialog, title: event.target.value })} placeholder={`Enter ${singularCategory(publicationCategory?.name || 'publication')} title`} /></label>
          <label><span>Publication code <small>Optional</small></span><input value={dialog.code} onChange={event => setDialog({ ...dialog, code: event.target.value })} placeholder="For example: od, T-30 or wp25.1" /></label>
        </>)}

        {dialog.kind === 'delete-publication' && <p className="adminDialogWarning">Delete <strong>{dialog.item.title}</strong>? This removes it from the publication list.</p>}
        {dialog.kind === 'delete-congregation' && <p className="adminDialogWarning">Delete <strong>{dialog.item.name}</strong>? Existing historical counts remain archived.</p>}

        {error && <p className="adminDialogError">{error}</p>}
        <footer><button type="button" className="secondary" onClick={close}>Cancel</button><button type="submit" className={dialog.kind.startsWith('delete') ? 'danger' : ''}>{dialog.kind.startsWith('delete') ? 'Delete' : dialog.kind === 'publication' && dialog.mode === 'add' ? `Add ${singularCategory(publicationCategory?.name || 'publication')}` : 'Save'}</button></footer>
      </form>
    </div>
  );
}
