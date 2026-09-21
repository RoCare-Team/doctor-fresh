'use client';

import { useRef, useState } from 'react';
import {
  Clapperboard, Upload, Loader2, X,
} from 'lucide-react';
import VideoEmbed, { videoSource } from '@/components/common/VideoEmbed';
import { uploadMedia } from '@/components/admin/editor/uploadMedia';

/**
 * One video for a page: paste a YouTube / Vimeo link, or upload a file
 * (straight to Vercel Blob on the live site). The value travels in a hidden
 * input called `name`, so the surrounding form saves it with everything else.
 */
export default function VideoField({
  name = 'videoUrl', defaultValue = '', label = 'Video', hint, onChange,
}) {
  const [value, setValue] = useState(defaultValue || '');
  const [draft, setDraft] = useState(defaultValue || '');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const commit = (next) => {
    setValue(next);
    setDraft(next);
    setError('');
    onChange?.(next);
  };

  function useLink() {
    const url = draft.trim();
    if (!url) { commit(''); return; }
    if (!videoSource(url)) { setError('Paste a YouTube or Vimeo link, or a link to an .mp4 / .webm file.'); return; }
    commit(url);
  }

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setError('');
    try {
      commit(await uploadMedia(file, { folder: 'video', onProgress: setProgress }));
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <p className="flex items-center gap-2 text-[14px] font-medium text-ink-800">
        <Clapperboard size={16} className="text-primary-600" aria-hidden="true" />
        {label}
      </p>
      {hint ? <p className="mt-0.5 text-[12.5px] text-ink-400">{hint}</p> : null}

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Inside a form: Enter must not submit it.
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); useLink(); } }}
          onBlur={() => { if (draft.trim() !== value) useLink(); }}
          placeholder="https://www.youtube.com/watch?v=…"
          className="h-10 min-w-0 flex-1 basis-64 rounded-lg border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-primary-500"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary-500 px-3.5 text-[13.5px] font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Upload size={15} aria-hidden="true" />}
          {busy ? `Uploading… ${progress}%` : 'Upload video'}
        </button>
        {value ? (
          <button type="button" onClick={() => commit('')} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13.5px] text-ink-500 hover:bg-danger/10 hover:text-danger">
            <X size={15} aria-hidden="true" />
            Remove
          </button>
        ) : null}
        <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      {error ? <p className="mt-1.5 text-[12.5px] text-danger">{error}</p> : null}

      {value && videoSource(value) ? (
        <div className="mt-3 max-w-lg">
          <VideoEmbed url={value} title="Video preview" />
        </div>
      ) : null}
    </div>
  );
}
