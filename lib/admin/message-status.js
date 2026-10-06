// The three states a contact or partner message can be in.
//
// Pure data, kept out of the SQL module so the admin screens — which run in
// the browser — can read the list without pulling the database driver in with
// it.

export const MESSAGE_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

export const messageStatusLabel = (id) => MESSAGE_STATUSES.find((s) => s.id === id)?.label || id;
