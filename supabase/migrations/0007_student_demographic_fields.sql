-- =====================================================================
-- Adds the remaining School Form 1 (SF1) register fields so a roster
-- like the ones your schools already keep can be imported without
-- losing information: parents' names, mother tongue, IP/ethnic group,
-- religion, and home address. All nullable — plenty of records won't
-- have every field filled in.
-- =====================================================================

alter table students
  add column father_name     text,
  add column mother_name     text,   -- mother's maiden name, per SF1 convention
  add column mother_tongue   text,
  add column ip_group        text,   -- Indigenous Peoples / ethnic group
  add column religion        text,
  add column home_address    text;
