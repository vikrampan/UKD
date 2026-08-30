-- Task codes were derived from COUNT(*), which is both a round trip per task
-- and a race: two concurrent creates read the same count and collide on the
-- unique index. A sequence is atomic and costs one round trip for any number
-- of codes.
CREATE SEQUENCE IF NOT EXISTS work.task_code_seq START 1;
