// Writes a product's page copy with OpenAI.
//
// Nothing here saves anything: it returns a draft — description, specification
// rows, features, reviews, keywords, meta tags and FAQs — which the admin then
// reads, edits and applies from the product screen. A page that goes live
// unread is the one thing this must not make easy.

import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export const keyConfigured = () => Boolean(process.env.OPENAI_API_KEY);

const SYSTEM = `You write product pages for Doctor Fresh, an Indian company selling water purifiers, RO plants, water softeners, ionisers and water ATMs, with its own service network across India.

House style:
- Plain Indian English, the way a good shop assistant explains things. No marketing noise ("revolutionary", "game-changing", "unlock").
- Specific over vague: litres, watts, stages, warranty months, TDS numbers.
- Never invent a certification, an award, a price, a guarantee or a statistic. If a detail is not given to you, leave it out rather than guess.
- Reviews read like real Indian customers: ordinary names, everyday detail (installation day, water taste, service visit, electricity bill), a mix of 4 and 5 stars with the occasional honest 3, and one or two mentioning a small drawback. Never mention a price in a review.

Reply with a JSON object only, in exactly this shape:
{
  "descriptionHtml": "3 to 5 paragraphs of plain HTML using only <p>, <h3>, <ul>, <li>, <strong>",
  "specs": [{ "label": "Capacity", "value": "10 litres" }],
  "features": ["...", "..."],
  "reviews": [{ "author": "Indian full name", "rating": 4.5, "title": "short heading, under 50 characters", "body": "2 to 3 sentences" }],
  "keywords": ["..."],
  "metaTitle": "under 60 characters",
  "metaDescription": "under 155 characters",
  "faqs": [{ "question": "...", "answer": "2 to 3 sentences" }]
}

Counts: 6 to 10 specs, 5 to 8 features, 8 reviews, 5 to 8 keywords, 5 FAQs.`;

/** The draft, or `{ error }` when it could not be written. */
export async function writeProductSeo({ product, context }) {
  if (!keyConfigured()) {
    return { error: 'The AI key is not set up yet. Add OPENAI_API_KEY to the site settings and try again.' };
  }

  const known = [
    `Product name: ${product.name}`,
    product.category ? `Category: ${product.category}` : null,
    product.salePrice ? `Price: ₹${product.salePrice}` : null,
    product.unit ? `Sold per: ${product.unit}` : null,
    product.specs?.length
      ? `Specifications already on the page:\n${product.specs.map((s) => `- ${s.label}: ${s.value}`).join('\n')}`
      : null,
    product.descriptionText
      ? `The description on the page today (rewrite it, keep any fact it states):\n${product.descriptionText.slice(0, 4000)}`
      : null,
    context ? `What the shop wants said:\n${context}` : null,
  ].filter(Boolean).join('\n\n');

  const client = new OpenAI();

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: MODEL,
      // The model is told to answer in JSON, and this holds it to that.
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 6000,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Write the page for this product.\n\n${known}` },
      ],
    });
  } catch (err) {
    console.error('[ai] product SEO request failed:', err.message);
    if (err?.status === 401) return { error: 'The AI key was refused. Check OPENAI_API_KEY.' };
    if (err?.status === 429) return { error: 'The AI account is out of quota or busy. Check the billing on the OpenAI dashboard.' };
    if (err?.status === 404) return { error: `The AI model "${MODEL}" is not available on this account.` };
    return { error: 'The AI service could not be reached. Try again.' };
  }

  const text = completion.choices?.[0]?.message?.content || '';
  const draft = parseDraft(text);
  if (!draft) {
    console.error('[ai] product SEO answer was not JSON:', text.slice(0, 200));
    return { error: 'The AI answered in a shape this screen could not read. Try again.' };
  }

  return { draft: tidy(draft) };
}

/** The answer should be bare JSON; a stray code fence or sentence is survivable. */
function parseDraft(text) {
  const body = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(body.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

const str = (v, max) => String(v ?? '').trim().slice(0, max);

/** Everything the screen will show, in the shape and the limits it expects. */
function tidy(draft) {
  const rating = (v) => {
    const n = Math.round(Number(v) * 2) / 2;
    return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 5;
  };

  return {
    descriptionHtml: str(draft.descriptionHtml, 20000),
    specs: (draft.specs || [])
      .slice(0, 20)
      .map((s) => ({ label: str(s?.label, 200), value: str(s?.value, 500) }))
      .filter((s) => s.label && s.value),
    features: (draft.features || []).slice(0, 12).map((f) => str(f, 300)).filter(Boolean),
    reviews: (draft.reviews || [])
      .slice(0, 12)
      .map((r) => ({
        author: str(r?.author, 255),
        rating: rating(r?.rating),
        title: str(r?.title, 50),
        body: str(r?.body, 2000),
      }))
      .filter((r) => r.author && r.title && r.body),
    keywords: (draft.keywords || []).slice(0, 12).map((k) => str(k, 60)).filter(Boolean),
    metaTitle: str(draft.metaTitle, 255),
    metaDescription: str(draft.metaDescription, 255),
    faqs: (draft.faqs || [])
      .slice(0, 10)
      .map((f) => ({ question: str(f?.question, 500), answer: str(f?.answer, 3000) }))
      .filter((f) => f.question && f.answer),
  };
}
