-- =====================================================================
-- Student rosters, SY 2026-2027 — Agbalite, Sulong Ipil and Baraas, from
-- each school's School Form 1 (SF1) registers. 77 students:
--
--   Agbalite     36: Kindergarten A 21 · Kindergarten B 9 · Grade 2 2
--                    Grade 3 2 · Grade 4 2      (no Grade 1 form sent)
--   Sulong Ipil  15: Kindergarten A 1 · Kindergarten B 1 · Grade 1 7
--                    Grade 3 2 · Grade 4 2 · Grade 5 2   (no Grade 2 this year)
--   Baraas       26: Kindergarten B 2 · Grade 1 8 · Grade 2 6
--                    Grade 3 4 · Grade 5 6      (no K-A or Grade 4 form sent)
--
-- Every count matches the totals printed on its form.
--
-- Paste the whole file into the Supabase SQL Editor and press Run. It is
-- one transaction: if anything goes wrong, nothing changes.
--
-- ADDS OR UPDATES, NEVER DUPLICATES. Agbalite's students were mostly
-- loaded already, from agbalite_roster_2026_2027.sql (typed up from a
-- PDF). A student already on file — same LRN, or same first name, last
-- name and birthdate at that school — is updated with the SF1's details
-- (LRN, spelling, parents, address and so on) instead of being added
-- again. Their grade, class and status are left exactly as they are.
-- Two Agbalite students are matched by their old spelling:
--   - Cabcaan, Jelyn (G4) was "Calocaan, Jelyn", born 2010-10-30; the
--     SF1 has Cabcaan, born 2010-11-30.
--   - Parisan, Mark Andrey (KB) was first name "Mark", middle "Andrey".
--
-- Students on file at Agbalite but NOT on these forms are left alone:
-- the 7 Grade 1 students (no form sent), plus Parisan, Cecil (KA),
-- Calbe, Jepoy (KB) and Villanueva, Melvin (G3). If those three have
-- left, mark them dropped/transferred on their page.
--
-- No teacher yet for Baraas Grade 5 (6 students): the teacher roster has
-- Mhae Marcha on Grades 2-3 only. A head teacher or admin can still see
-- them.
--
-- Safe to re-run: the second time, everyone is "already on file".
-- =====================================================================

begin;

drop table if exists _sf1;
create temp table _sf1 (
  school_slug text, grade_code text, lrn text, sex text, last_name text, first_name text,
  middle_name text, suffix text, birthdate date, father_name text, mother_name text,
  mother_tongue text, ip_group text, religion text, home_address text, notes text,
  -- How the student was spelled in an earlier import, when that differs.
  prev_last_name text, prev_first_name text, prev_birthdate date
);

insert into _sf1 values
    -- ===== Agbalite =====
    -- Kindergarten A, Male (13)
    ('agbalite', 'KA', '429506260001', 'M', 'Calbe', 'Jernel', 'Parisan', null, date '2019-03-22', 'Calbe, Jimboy Parisan', 'Parisan, Mellite Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260002', 'M', 'Calve', 'Janleo', 'Parisan', null, date '2018-03-30', 'Calve, Tario Tungkarawin', 'Parisan, Helen Calve', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260004', 'M', 'Calve', 'Nelmar', 'Parisan', null, date '2018-12-18', 'Calve, Noel Tungkarawin', 'Parisan, Mary Gilagid', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260003', 'M', 'Calve', 'Sedrick', 'Lagnaan', null, date '2017-02-28', 'Calve, Alvin Parisan', 'Lagnaan, Cedy Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260005', 'M', 'Parisan', 'Adrel', 'Parisan', null, date '2019-01-18', 'Parisan, Lado Parisan', 'Parisan, Susan Tamisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260006', 'M', 'Parisan', 'Allen', 'Parisan', null, date '2017-09-28', 'Parisan, Arnel Parisan', 'Parisan, Evamae Cubil', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260007', 'M', 'Parisan', 'Amiel', 'Parisan', null, date '2020-07-14', 'Parisan, Arnel Parisan', 'Parisan, Evamae Cubil', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260008', 'M', 'Parisan', 'Kenneth', 'Cabcaan', null, date '2018-08-08', null, 'Cabcaan, Mercing Calbe', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260009', 'M', 'Tamisan', 'Francis', 'Cabcaan', null, date '2014-11-05', 'Tamisan, Modie Tobias', 'Cabcaan, Liway Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260010', 'M', 'Tamisan', 'Jericho', 'Parisan', null, date '2016-12-19', 'Tamisan, Modie Tobias', 'Parisan, Blanca Bunsuan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260011', 'M', 'Tamisan', 'Renzlee', 'Cabcaan', null, date '2019-10-30', 'Tamisan, Modie Tobias', 'Cabcaan, Liway Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260012', 'M', 'Tampulayan', 'Jorince', 'Tampulayan', null, date '2018-11-23', 'Tampulayan, Jonas Tamisan', 'Tampulayan, Maymae Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260013', 'M', 'Tampulayan', 'Pungay', 'Cabcaan', null, date '2019-05-01', 'Tampulayan, Rolan Tamisan', 'Cabcaan, Maymae Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    -- Kindergarten A, Female (8)
    ('agbalite', 'KA', '429506260015', 'F', 'Cabcaan', 'Ressie', 'Parisan', null, date '2017-09-06', 'Cabcaan, Mandie Parisan', 'Parisan, Erly Calve', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260014', 'F', 'Calbe', 'Eunice', 'Solita', null, date '2018-06-26', 'Calbe, Mandie Parisan', 'Solita, Jonnaveth Tamisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260016', 'F', 'Parisan', 'Ivy', 'Parisan', null, date '2016-05-01', 'Parisan, Fernan Villanueva Sr', 'Parisan, Bebeth Tamisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260017', 'F', 'Parisan', 'Janice', 'Tamisan', null, date '2019-01-27', 'Parisan, Silver Calve', 'Tamisan, Ellen Tobias', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260018', 'F', 'Parisan', 'Jasmin', 'Tamisan', null, date '2017-05-09', 'Parisan, Silver Calve', 'Tamisan, Ellen Tobias', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260019', 'F', 'Tamisan', 'Alaiza', 'Tobias', null, date '2013-12-17', 'Tamisan, Carling Parisan', 'Tobias, Avelina Liwayan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260020', 'F', 'Villanueva', 'Jenie', 'Casula', null, date '2019-09-16', 'Villanueva, Bernie Parisan', 'Casula, Jessica Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KA', '429506260021', 'F', 'Villanueva', 'Margie', 'Cabcaan', null, date '2018-11-08', 'Villanueva, Marco Parisan', 'Cabcaan, Vilma Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    -- Kindergarten B, Male (6)
    ('agbalite', 'KB', '429506250003', 'M', 'Parisan', 'Arvin', 'Parisan', null, date '2014-05-01', 'Parisan, Lado Parisan', 'Parisan, Susan Tamisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KB', '110051210014', 'M', 'Parisan', 'Mark Andrey', null, null, date '2013-09-02', null, 'Parisan, Lolit Tamisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, 'Parisan', 'Mark', date '2013-09-02'),
    ('agbalite', 'KB', '429506260023', 'M', 'Tamisan', 'Randel', 'Cabcaan', null, date '2016-07-23', 'Tamisan, Modie Tobias', 'Cabcaan, Liway Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KB', '429506260022', 'M', 'Tampulayan', 'Lenard', 'Cabcaan', null, date '2017-03-01', 'Tampulayan, Rolan Tamisan', 'Cabcaan, Maymae Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KB', '429506250004', 'M', 'Villanueva', 'Brendon', 'Parisan', null, date '2015-10-21', 'Villanueva, Heron Parisan', 'Parisan, Miranda Gilagid', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KB', '429506260024', 'M', 'Villanueva', 'Rex', 'Cabcaan', null, date '2016-12-02', 'Villanueva, Mario Parisan', 'Cabcaan, Vilma Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    -- Kindergarten B, Female (3)
    ('agbalite', 'KB', '429506260025', 'F', 'Cabcaan', 'Mecy', 'Parisan', null, date '2015-02-26', 'Cabcaan, Mandie Parisan', 'Parisan, Erly Calve', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KB', '429506260026', 'F', 'Calbe', 'Teresa', 'Parisan', null, date '2016-08-26', 'Calbe, Jimboy Parisan', 'Parisan, Melitte Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'KB', '429506210010', 'F', 'Parisan', 'Narcisa', 'Tamisan', null, date '2013-06-12', 'Parisan, Melanio Gilagid', 'Tamisan, Noemi Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    -- Grade 2, Male (1)
    ('agbalite', 'G2', '110051210015', 'M', 'Parisan', 'Bernie', null, 'Jr.', date '2015-12-21', null, 'Parisan, Lolit Tamisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    -- Grade 2, Female (1)
    ('agbalite', 'G2', '429506210004', 'F', 'Calve', 'Jesabel', 'Parisan', null, date '2014-08-06', 'Calve, Noel Tungkarawin', 'Parisan, Mary Gilagid', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    -- Grade 3, Female (2)
    ('agbalite', 'G3', '429506200009', 'F', 'Parisan', 'Bea', 'Parisan', null, date '2011-07-08', 'Parisan, Fernan Villanueva Sr', 'Parisan, Bebeth Tamisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    ('agbalite', 'G3', '429506210008', 'F', 'Tampulayan', 'Erica', 'Cabcaan', null, date '2013-12-12', 'Tampulayan, Rolan Tamisan', 'Cabcaan, Maymae Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    -- Grade 4, Male (1)
    ('agbalite', 'G4', '429512190019', 'M', 'Parisan', 'Miguel', 'Tamisan', null, date '2011-12-05', 'Parisan, Melanio Gilagid', 'Tamisan, Noemi Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, null, null, null),
    -- Grade 4, Female (1)
    ('agbalite', 'G4', '429512190020', 'F', 'Cabcaan', 'Jelyn', 'Parisan', null, date '2010-11-30', 'Cabcaan, Mandie Parisan', 'Parisan, Erly Calve', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null, 'Calocaan', 'Jelyn', date '2010-10-30'),
    -- ===== Sulong Ipil =====
    -- Kindergarten A, Male (1)
    ('sulong-ipil', 'KA', '429512260001', 'M', 'Hernandez', 'Russel James', 'Hachaso', null, date '2021-05-13', 'Hernandez, Rosandy Cabrera', 'Hachaso, Isabel Manalo', 'Tagalog', null, 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', null, null, null, null),
    -- Kindergarten B, Male (1)
    ('sulong-ipil', 'KB', '429512250002', 'M', 'Alcaraz', 'Mark Johann', 'Iglesia', null, date '2016-03-26', 'Alcaraz, Pio Ariola', 'Iglesia, Maruja Sotto', 'Tagalog', null, 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', null, null, null, null),
    -- Grade 1, Male (5)
    ('sulong-ipil', 'G1', '110152230002', 'M', 'Hernandez', 'Raibel', 'Hachaso', null, date '2018-05-02', 'Hernandez, Rosandy Cabrera', 'Hachaso, Isabel Manalo', 'Tagalog', null, 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('sulong-ipil', 'G1', '429512230001', 'M', 'Hernandez', 'Robel', 'Hachaso', null, date '2014-02-21', 'Hernandez, Rosandy Cabrera', 'Hachaso, Isabel Manalo', 'Tagalog', null, 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', null, null, null, null),
    ('sulong-ipil', 'G1', '429512240002', 'M', 'Hernandez', 'Roniel', 'Hachaso', null, date '2016-01-16', 'Hernandez, Rosandy Cabrera', 'Hachaso, Isabel Manalo', 'Tagalog', null, 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', null, null, null, null),
    ('sulong-ipil', 'G1', '110152230001', 'M', 'Pantilo', 'Rickler', 'Hachaso', 'Jr.', date '2018-04-30', 'Pantilo, Rickler Febres', 'Hachaso, Maribel Manalo', 'Tagalog', null, 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', 'Transferred in (pending, per SF1)', null, null, null),
    ('sulong-ipil', 'G1', '110183250002', 'M', 'Tipora', 'Niel Angelo', 'Dela Cruz', null, date '2020-09-23', 'Tipora, Nathaniel Ortiz', 'Dela Cruz, Angelica Cadas', 'Tagalog', 'Iraya', 'Indigenous Religion', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', 'Transferred in (pending, per SF1)', null, null, null),
    -- Grade 1, Female (2)
    ('sulong-ipil', 'G1', '429507250010', 'F', 'Momo', 'Zyra Leilani', 'Gadugdug', null, date '2018-07-27', 'Momo, Michael', 'Gadugdug, Dolor', 'Tagalog', null, 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('sulong-ipil', 'G1', '110186240024', 'F', 'Ursus', 'Myra Mae', null, null, date '2017-09-16', null, 'Ursus, Mary Anne Narciso', 'Tagalog', 'Alangan', 'Christianity', 'Barangay Talabaan, Mamburao, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    -- Grade 3, Male (2)
    ('sulong-ipil', 'G3', '114503210074', 'M', 'Momo', 'Zion', 'Gadugdug', null, date '2015-12-11', 'Momo, Michael Aquino', 'Gadugdug, Dolor Cidro', 'Bikol, Central', null, 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('sulong-ipil', 'G3', '429512230002', 'M', 'Reyes', 'Brynt', 'Azuelo', null, date '2015-02-27', 'Reyes, David Hermojino', 'Azuelo, Mary Glenn Pama', 'Tagalog', null, 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', null, null, null, null),
    -- Grade 4, Male (2)
    ('sulong-ipil', 'G4', '110152170026', 'M', 'Hernandez', 'Rodel', 'Hachaso', null, date '2011-09-05', 'Hernandez, Rosandy Cabrera', 'Hachaso, Isabel Manalo', 'Tagalog', null, 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', null, null, null, null),
    ('sulong-ipil', 'G4', '110164180006', 'M', 'Reyes', 'Dheynver', 'Azuelo', null, date '2013-09-18', 'Reyes, David Hermogino', 'Azuelo, Mary Glenn Pama', 'Tagalog', null, 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    -- Grade 5, Male (1)
    ('sulong-ipil', 'G5', '114503190016', 'M', 'Momo', 'Zeus Lemuel', 'Gadugdug', null, date '2013-10-14', 'Momo, Michael Aquino', 'Gadugdug, Dolor Cidro', 'Tagalog', null, 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    -- Grade 5, Female (1)
    ('sulong-ipil', 'G5', '429512200001', 'F', 'Senerser', 'Ellenor Joy', null, null, date '2014-09-11', null, 'Senerser, Babynor Panday', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Fatima (Tii), Mamburao, Occidental Mindoro', null, null, null, null),
    -- ===== Baraas =====
    -- Kindergarten B, Male (1)
    ('baraas', 'KB', '411496260020', 'M', 'Agrumiran', 'Dondon', 'Torreliza', null, date '2018-03-18', 'Agrumiran, Manival', 'Torreliza, Nene Acosta', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    -- Kindergarten B, Female (1)
    ('baraas', 'KB', '411496260019', 'F', 'Masinda', 'Gerin', 'Alibasan', null, date '2015-04-28', 'Macinda, Mandil', 'Alibasan, Mela', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', null, null, null, null),
    -- Grade 1, Male (6)
    ('baraas', 'G1', '110157220010', 'M', 'Alibasan', 'Robert', 'Lamayor', null, date '2015-09-19', 'Alibasan, Rodel', 'Lamayor, Macita', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G1', '110157220003', 'M', 'Daguman', 'Alde', 'Cuzon', null, date '2015-08-22', 'Daguman, Romel Mayuman', 'Cuzon, Morena Alibasan', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G1', '137256230006', 'M', 'Fernando', 'Peter', 'Panday', null, date '2018-08-16', 'Fernando, Moriel Masinda', 'Panday, Mikaela Umalmon', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in (pending, per SF1)', null, null, null),
    ('baraas', 'G1', '137256250007', 'M', 'Lamayor', 'Tjay', 'Alibasan', null, date '2020-06-12', 'Lamayor, Jay-Ar Cuzon', 'Alibasan, Todeth Quinones', 'Alangan', 'Alangan', 'Others', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Learner with disability (LWD, per SF1); Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G1', '110157220006', 'M', 'Morales', 'Jayson', 'Acosta', null, date '2014-10-26', 'Morales, Michael', 'Acosta, Ailyn', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G1', '110157220007', 'M', 'Panday', 'Renel', 'Quiñones', null, date '2016-02-15', 'Panday, Obed Umalmon', 'Quiñones, Rosinda Balatan', 'Iraya', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    -- Grade 1, Female (2)
    ('baraas', 'G1', '110157220031', 'F', 'Manalo', 'Monica', 'Maayas', null, date '2016-06-19', 'Manalo, Ramil Morales', 'Manalo, Merlita Maayas', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G1', '110157220035', 'F', 'Torreliza', 'Lian', 'Lamayor', null, date '2017-10-06', 'Torreliza, Jerry', 'Lamayor, Lilian', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    -- Grade 2, Male (5)
    ('baraas', 'G2', '110157200017', 'M', 'Agromeran', 'Ahay', 'Torreliza', null, date '2014-09-20', 'Agromeran, Manibal', 'Torreliza, Nene Acosta', 'Iraya', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G2', '110157210027', 'M', 'Agrumeran', 'Marwin', 'Macinda', null, date '2016-04-26', 'Agrumeran, Noel Malaylay', 'Macinda, Madel Damaso', 'Iraya', 'Alangan', 'Christianity', 'Barangay Casague, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G2', '110181220084', 'M', 'Balatan', 'Darren', 'Fernando', null, date '2017-07-26', 'Balatan, Renato M', 'Fernando, Rizza B', 'Tagalog', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G2', '110157210007', 'M', 'Lamayor', 'Jaymark', 'Quiñones', null, date '2015-08-08', 'Lamayor, Enardo Cuzon', 'Quiñones, Ofelia Balaton', 'Iraya', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G2', '110157210012', 'M', 'Torreliza', 'Jerico', null, null, date '2016-01-16', 'Torreliza, Jerry', 'Lamayor, Lilian', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    -- Grade 2, Female (1)
    ('baraas', 'G2', '110183170015', 'F', 'Fernando', 'Nearen', 'Panday', null, date '2011-07-18', 'Fernando, Moriel Masinda', 'Panday, Micaela Umalmon', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in (pending, per SF1)', null, null, null),
    -- Grade 3, Male (1)
    ('baraas', 'G3', '110157200023', 'M', 'Fernando', 'Markjoy', 'Panday', null, date '2014-11-24', 'Fernando, Moriel Macinda', 'Panday, Mikaela Umalmon', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    -- Grade 3, Female (3)
    ('baraas', 'G3', '110181220064', 'F', 'Balatan', 'Dialyn', 'Acosta', null, date '2015-12-15', 'Balatan, Rikiy', 'Acosta, Diday', 'Tagalog', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G3', '110157210015', 'F', 'Daguman', 'Judith', 'Bernardo', null, date '2015-09-07', 'Daguman, Romy Mayuman', 'Bernardo, Dulia Alibasan', 'Iraya', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G3', '110157200009', 'F', 'Lauyman', 'Jireh', 'Quiñones', null, date '2015-02-03', 'Lauyman, Joatham Gusigyon', 'Quiñones, Marleth Balatan', 'Iraya', 'Alangan', 'Christianity', 'Barangay Casague, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    -- Grade 5, Male (3)
    ('baraas', 'G5', '110181180006', 'M', 'Daguman', 'Rolando', 'Bernardo', null, date '2011-04-23', 'Daguman, Romeo', 'Bernardo, Dolia', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G5', '110157180001', 'M', 'Lauyman', 'Israel', 'Quiñones', null, date '2013-01-02', 'Lauyman, Joatham Gusigion', 'Quiñones, Marieth Balatan', 'Iraya', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G5', '110157180017', 'M', 'Panday', 'Reymark', 'Quiñones', null, date '2012-10-29', 'Panday, Obed Omanmon', 'Quiñones, Rosinda Balatan', 'Iraya', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    -- Grade 5, Female (3)
    ('baraas', 'G5', '110157180012', 'F', 'Daguman', 'Ronelyn', 'Cuzon', null, date '2012-09-06', 'Daguman, Romel Mayuman', 'Cuzon, Morena Alibasan', 'Iraya', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G5', '110157180013', 'F', 'Fernando', 'Mildred', 'Panday', null, date '2012-12-27', 'Fernando, Moriel Masinda', 'Panday, Mikaela Umalmon', 'Iraya', 'Iraya', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null),
    ('baraas', 'G5', '110157180020', 'F', 'Masinda', 'Rubilyn', 'Alibasan', null, date '2013-02-12', 'Masinda, Mandil Damaso', 'Alibasan, Mila Quiñones', 'Iraya', 'Alangan', 'Christianity', 'Barangay Lumangbayan, Santa Cruz, Occidental Mindoro', 'Transferred in 2026-08-03', null, null, null);

-- Which of these is already on file, at the same school.
drop table if exists _sf1_match;
create temp table _sf1_match as
select r.*, sc.id as school_id, gl.id as grade_level_id,
  (select st.id from students st
   where st.school_id = sc.id
     and (st.lrn = r.lrn
          or (normalize_person_name(st.first_name) = normalize_person_name(r.first_name)
              and normalize_person_name(st.last_name) = normalize_person_name(r.last_name)
              and st.birthdate = r.birthdate)
          or (r.prev_last_name is not null
              and normalize_person_name(st.first_name) = normalize_person_name(r.prev_first_name)
              and normalize_person_name(st.last_name) = normalize_person_name(r.prev_last_name)
              and st.birthdate = r.prev_birthdate))
   order by (st.lrn = r.lrn) desc nulls last, st.created_at
   limit 1) as student_id
from _sf1 r
join schools sc on sc.slug = r.school_slug
join grade_levels gl on gl.code = r.grade_code;

do $$
declare n int;
begin
  select count(*) into n from _sf1_match;
  if n <> 77 then
    raise exception 'Expected 77 students, matched % — a school or grade code is missing from the database', n;
  end if;
end $$;

-- Already on file: bring their details up to the SF1. Names, LRN and
-- birthdate are taken from the form; anything the form leaves blank keeps
-- what was there. Grade, class and status are not touched.
update students st
set lrn = m.lrn,
    last_name = m.last_name,
    first_name = m.first_name,
    middle_name = m.middle_name,
    suffix = m.suffix,
    sex = m.sex,
    birthdate = m.birthdate,
    father_name = coalesce(m.father_name, st.father_name),
    mother_name = coalesce(m.mother_name, st.mother_name),
    mother_tongue = coalesce(m.mother_tongue, st.mother_tongue),
    ip_group = coalesce(m.ip_group, st.ip_group),
    religion = coalesce(m.religion, st.religion),
    home_address = coalesce(m.home_address, st.home_address),
    notes = coalesce(m.notes, st.notes),
    updated_at = now()
from _sf1_match m
where st.id = m.student_id;

-- New: add them, in their grade's main class.
with added as (
  insert into students (
    school_id, current_grade_level_id, lrn, sex, first_name, middle_name, last_name, suffix,
    birthdate, father_name, mother_name, mother_tongue, ip_group, religion, home_address, notes, status
  )
  select school_id, grade_level_id, lrn, sex, first_name, middle_name, last_name, suffix,
         birthdate, father_name, mother_name, mother_tongue, ip_group, religion, home_address, notes, 'active'
  from _sf1_match
  where student_id is null
  returning id, lrn, school_id
)
update _sf1_match m set student_id = a.id
from added a
where m.student_id is null and m.lrn = a.lrn and m.school_id = a.school_id;

alter table _sf1_match add column was_new boolean;
-- now() is fixed for the whole transaction, so this is exactly the rows added above.
update _sf1_match m set was_new = (st.created_at = now())
from students st where st.id = m.student_id;

insert into student_enrollments (student_id, school_id, grade_level_id, school_year_id)
select st.id, st.school_id, st.current_grade_level_id, sy.id
from _sf1_match m
join students st on st.id = m.student_id
cross join (select id from school_years where is_current) sy
where st.current_grade_level_id is not null
on conflict (student_id, school_year_id) do nothing;

commit;

-- ---------------------------------------------------------------------
-- What you should see: per school and class, how many came from these
-- forms (added new / already on file and updated), how many students on
-- file aren't on the forms, and the class teacher.
-- ---------------------------------------------------------------------
select sc.name as "School", gl.name as "Grade", coalesce(cs.name, '—') as "Class",
       count(distinct st.id) filter (where m.was_new) as "Added",
       count(distinct st.id) filter (where m.student_id is not null and not m.was_new) as "Updated",
       count(distinct st.id) filter (where m.student_id is null) as "On file, not on form",
       coalesce(max(t.full_name), '— no teacher —') as "Teacher"
from students st
join schools sc on sc.id = st.school_id and sc.slug in ('agbalite', 'sulong-ipil', 'baraas')
join grade_levels gl on gl.id = st.current_grade_level_id
left join class_sections cs on cs.id = st.section_id
left join class_subject_teachers cst on cst.section_id = cs.id
left join teachers t on t.id = cst.teacher_id
left join _sf1_match m on m.student_id = st.id
where st.status = 'active'
group by sc.name, gl.name, gl.sort_order, cs.name
order by sc.name, gl.sort_order, cs.name;
