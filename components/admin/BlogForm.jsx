'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Select, Textarea, FormNote } from '@/components/forms/Field';
import Button from '@/components/common/Button';

/**
 * Editing an article.
 *
 * The body is edited as HTML, which is how the current admin panel stores it —
 * pasting from a rich editor keeps working, and existing markup is not mangled
 * by a converter.
 */
export default function BlogForm({ post, categories }) {
  const router = useRouter();
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');

    const values = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch('/api/admin/blogs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, ...values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not save the post.');

      setStatus('done');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="rounded-xl border border-line bg-white p-5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input label="Title" name="title" defaultValue={post.title} required maxLength={500} className="sm:col-span-2" />
          <Select
            label="Category"
            name="categoryId"
            defaultValue={String(post.categoryId)}
            options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Select category"
          />
          <Input label="Author" name="author" defaultValue={post.author} maxLength={500} />
          <Input label="Published date" name="date" type="date" defaultValue={post.date} />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Content</h2>
        <div className="mt-4 grid gap-3.5">
          <Textarea label="Excerpt" name="excerpt" rows={3} defaultValue={post.excerpt} maxLength={1000} />
          <Textarea
            label="Body (HTML)"
            name="contentHtml"
            rows={18}
            defaultValue={post.contentHtml}
            className="[&_textarea]:font-mono [&_textarea]:text-[13px]"
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink-900">Search listing</h2>
        <Textarea label="Meta description" name="metaDescription" rows={2} defaultValue={post.metaDescription} className="mt-4" />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save post'}
        </Button>
        {status === 'done' ? <span className="text-[14px] text-success">Saved</span> : null}
      </div>

      {status === 'error' ? <FormNote status="error" error={error} /> : null}
    </form>
  );
}
