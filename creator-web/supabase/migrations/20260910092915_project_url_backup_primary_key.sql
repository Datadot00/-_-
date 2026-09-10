-- Keep the stage-3 recovery snapshot self-identifying without exposing it.

alter table private.project_url_backup_20260910
  add constraint project_url_backup_20260910_pkey primary key (id);
