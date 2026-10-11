-- =====================================================================
-- Binuangan student roster, SY 2026-2027 — 83 students, Kindergarten A
-- through Grade 5, from the school's School Form 1 (SF1) registers
-- (Kinder_A.xls, Kinder_B.xls, Grade_1.xls ... Grade_5.xls).
--
--   Kindergarten A 29 · Kindergarten B 11 · Grade 1 15 · Grade 2 17
--   Grade 3 2 · Grade 4 7 · Grade 5 2   (matches each form's own totals)
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to re-run: a student already on file (same LRN, or same name and
-- birthdate at Binuangan) is skipped, never duplicated.
--
-- Everyone lands in their grade's main class. Kindergarten A at
-- Binuangan has two teachers (Cris Magallano and Brigette Landao), and
-- the SF1 lists the 29 as one section, so all 29 start in Cris's class;
-- a head teacher moves Brigette's half across from each student's page.
--
-- Corrected from the forms:
--   - Parisan, Erilyn (G2): father and mother were entered in each
--     other's columns. Her siblings' rows list the same couple, father
--     Parisan, Ernie Paitan and mother Sambutan, Lea.
--   - Bonsoan, Angela (G1): mother's surname typed "Tubgkarawin";
--     her sister Alona's row has Tungkarawin.
-- Worth checking on the paper register:
--   - Casula, Jocilyn (Kinder A): birthdate 2010-07-12, which makes her
--     16 in kindergarten.
--   - 9 students are marked transferred-in (5 still "pending" on the
--     form); that's recorded in their notes.
-- =====================================================================

with roster (grade_code, lrn, sex, last_name, first_name, middle_name, birthdate,
             father_name, mother_name, mother_tongue, ip_group, religion, home_address, notes) as (
  values
    -- Kindergarten A, Male (15)
    ('KA', '429507260014', 'M', 'Alonzo', 'Domenic', 'Casula', date '2018-02-24', 'Alonzo, Rolando Parisan', 'Casula, Manialyn Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260015', 'M', 'Cabcaan', 'Marpol', 'Casula', date '2018-05-22', 'Cabcaan, Nico Reyes', 'Casula, Malyn Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260016', 'M', 'Casula', 'John Mark', 'Sambutan', date '2018-12-15', 'Casula, Jerry Villanueva', 'Sambutan, Norma Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260017', 'M', 'Casula', 'Jokonel', 'Calve', date '2017-04-09', 'Casula, Lordan Villanueva', 'Calve, Ajie Cubil', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260018', 'M', 'Gayadan', 'Marwin', 'Linumbay', date '2015-12-08', 'Gayadan, Jesus Villanueva Jr', 'Linumbay, Mylene Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260019', 'M', 'Mamildang', 'Jonathan', 'Tungkarawin', date '2018-10-05', 'Mamildang, Efren Parisan', 'Tungkarawin, Thelma Dela Cruz', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260020', 'M', 'Parisan', 'Christean', 'Sambutan', date '2018-02-15', 'Parisan, Earnie Paitan', 'Sambutan, Lea Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260021', 'M', 'Parisan', 'Johnmark', 'Ulayan', date '2017-11-10', 'Parisan, Rocky Villanueva', 'Ulayan, Vivian Casula', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260022', 'M', 'Parisan', 'Joshua', 'Sambutan', date '2019-04-20', 'Parisan, Francis Pandac', 'Sambutan, Gema Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260023', 'M', 'Parisan', 'Markgel', 'Casula', date '2018-05-18', 'Parisan, Angel Parisan', 'Casula, Carlota Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260024', 'M', 'Tungkarawin', 'Darren', 'Parisan', date '2019-04-24', 'Tungkarawin, Pulonio Liwayan', 'Parisan, Darna Masaldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260025', 'M', 'Tungkarawin', 'Jared', 'Parisan', date '2019-11-04', 'Tungkarawin, Jerwin Liwayan', 'Parisan, Recca Masaldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260026', 'M', 'Tungkarawin', 'Jessie Mar', 'Parisan', date '2019-12-17', 'Tungkarawin, Gerry Sanutan', 'Parisan, Ruby Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260027', 'M', 'Tungkarawin', 'John Ric', 'Casula', date '2018-10-30', 'Villanueva, Rico Cubil', 'Casula, Caren Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260028', 'M', 'Tungkarawin', 'Ronjel', 'Casula', date '2018-08-15', 'Tungkarawin, Ariel Calbe', 'Casula, Emma Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Kindergarten A, Female (14)
    ('KA', '429507260001', 'F', 'Barcelona', 'Jeverlyn', 'Parisan', date '2018-06-22', 'Barcelona, Oliver Pajares', 'Parisan, Arlene Masaldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260002', 'F', 'Bonsoan', 'Alona', 'Tungkarawin', date '2016-12-12', 'Bonsoan, Gilbert Parisan', 'Tungkarawin, Shelma Dela Cruz', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260003', 'F', 'Bulalaque', 'Julia', 'Casula', date '2018-07-16', 'Bulalaque, Jender Bon', 'Casula, Thelma Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260010', 'F', 'Bulalaque', 'Rhean', 'Parisan', date '2019-11-28', 'Bulalaque, Joubert Bon', 'Parisan, Regine Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260004', 'F', 'Casula', 'Anabel', 'Sambutan', date '2019-02-28', 'Casula, Rodel Villanueva', 'Sambutan, Bedie Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260005', 'F', 'Casula', 'Angie Ann', 'Tungkarawin', date '2019-01-09', 'Casula, Randy Parisan', 'Tungkarawin, Rhea Cubil', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260006', 'F', 'Casula', 'Jocilyn', 'Parisan', date '2010-07-12', 'Casula, Dino Villanueva', 'Parisan, Mercing Paitan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260007', 'F', 'Casula', 'Josel', 'Calve', date '2019-06-18', 'Casula, Lordan Villanueva', 'Calve, Ajie Cubil', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260011', 'F', 'Colot', 'Almera', 'Casula', date '2014-12-21', 'Colot, Alvin Parisan', 'Casula, May Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260008', 'F', 'Masaldang', 'Rocelyn', 'Masalansan', date '2019-07-18', 'Masaldang, Romano Parisan', 'Masalansan, Neneng Gayadan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '110052220022', 'F', 'Masaldang', 'Rubylyn', 'Masalansan', date '2015-02-28', 'Masaldang, Romano Parisan', 'Masalansan, Neneng Gayadan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Alipaoy, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('KA', '429507260009', 'F', 'Paitan', 'Cecil', 'Casula', date '2017-02-02', 'Paitan, Ricky Lagnaan', 'Casula, Rose Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260012', 'F', 'Parisan', 'Lede', 'Ulayan', date '2019-01-06', 'Parisan, Rocky Villanueva', 'Ulayan, Vivian Casula', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KA', '429507260013', 'F', 'Villanueva', 'Marian', 'Masaldang', date '2019-04-07', 'Villanueva, Carlo Reyes', 'Masaldang, Myra Hinalman', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Kindergarten B, Male (7)
    ('KB', '429507250001', 'M', 'Cabcaan', 'Marboy', 'Casula', date '2016-03-03', 'Cabcaan, Niko', 'Casula, Malyn', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KB', '429507250002', 'M', 'Casula', 'Angelo', 'Tungkarawin', date '2015-11-16', 'Casula, Rady', 'Tungkarawin, Rhea', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KB', '429507260031', 'M', 'Colot', 'Aljun', 'Casula', date '2016-06-08', 'Colot, Alvin Parisan', 'Casula, May Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KB', '429507250006', 'M', 'Masaldang', 'Marboy', 'Hinalman', date '2015-11-24', 'Masaldang, Nardo', 'Hinalman, Rida', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KB', '429507250004', 'M', 'Parisan', 'Le Mark', 'Ulayan', date '2015-09-22', 'Parisan, Rocky', 'Ulayan, Vivian', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KB', '429507250005', 'M', 'Parisan', 'Remboy', 'Casula', date '2015-07-04', 'Parisan, Rady', 'Casula, Marie', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KB', '429507260030', 'M', 'Villanueva', 'Rickmel', 'Casula', date '2017-02-28', 'Villanueva, Rico', 'Casula, Caren', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Kindergarten B, Female (4)
    ('KB', '429507250008', 'F', 'Casula', 'Angelyn', 'Villanueva', date '2016-09-18', 'Casula, Tim', 'Villanueva, Lusana', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KB', '429507260029', 'F', 'Casula', 'Jen Jen', 'Parisan', date '2017-02-15', 'Casula, Regie', 'Parisan, Vangie Masaldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KB', '429507250009', 'F', 'Colot', 'Rose Ann', 'Parisan', date '2017-03-15', 'Colot, Celon', 'Parisan, Irene', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('KB', '429507250011', 'F', 'Parisan', 'Ellen', 'Pandac', date '2015-07-05', 'Parisan, Ego', 'Pandac, Lina', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Grade 1, Male (8)
    ('G1', '429507240006', 'M', 'Casula', 'Albert', 'Villanueva', date '2014-11-11', 'Casula, Tim', 'Villanueva, Lusana Punlaan', 'Tagalog', 'Iraya', 'Christianity', 'Paluan, Occidental Mindoro', null),
    ('G1', '429507240007', 'M', 'Casula', 'Alfred', 'Sambutan', date '2014-02-17', 'Casula, Rodel Villanueva', 'Sambutan, Bedie Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G1', '429507240001', 'M', 'Casula', 'Jempol', 'Parisan', date '2012-08-15', 'Casula, Dino Villanueva', 'Parisan, Mercing Paitan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G1', '429507220005', 'M', 'Casula', 'Orlan', 'Sambutan', date '2011-08-20', 'Casula, Rodel Villanueva', 'Sambutan, Bedie Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G1', '429507240002', 'M', 'Mamildang', 'Ephraim', 'Tungkarawin', date '2016-01-31', 'Mamildang, Efren Parisan', 'Tungkarawin, Thelma', 'Tagalog', 'Iraya', 'Christianity', 'Paluan, Occidental Mindoro', null),
    ('G1', '429507250003', 'M', 'Parisan', 'Jimcis', 'Sambutan', date '2017-05-25', 'Parisan, Francis', 'Sambutan, Gemma', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G1', '429507240008', 'M', 'Parisan', 'Linuel', 'Sambutan', date '2015-09-01', 'Parisan, Ernie Paitan', 'Sambutan, Lea Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G1', '429507240009', 'M', 'Parisan', 'Ronron', 'Pandac', date '2013-12-24', 'Parisan, Ego Pandac', 'Pandac, Lina Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Grade 1, Female (7)
    ('G1', '429507240003', 'F', 'Barcelona', 'Princess Lyn', 'Parisan', date '2016-12-09', 'Barcelona, Oliver Pajares', 'Parisan, Arlene Masaldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('G1', '110050240012', 'F', 'Bonsoan', 'Angela', 'Tungkarawin', date '2018-06-08', 'Bonsoan, Gilbert Parisan', 'Tungkarawin, Shelma Dela Cruz', 'Filipino', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in 2026-08-03'),
    ('G1', '110050240021', 'F', 'Bulalaque', 'Janine', 'Parisan', date '2018-06-23', 'Bulalaque, Joubert Bon', 'Parisan, Regine Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in 2026-08-03'),
    ('G1', '429507250007', 'F', 'Calve', 'Ivy', 'Parisan', date '2016-11-07', 'Calve, Arnel', 'Parisan, Elizabeth', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G1', '429507240010', 'F', 'Colot', 'Rosana', 'Parisan', date '2015-12-02', 'Colot, Celon Parisan', 'Parisan, Irene Masaldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G1', '429507210008', 'F', 'Parisan', 'Lezel', 'Ulayan', date '2013-11-14', 'Parisan, Rocky Villanueva', 'Ulayan, Vivian Casula', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G1', '169525250011', 'F', 'Parisan', 'Lysa Grace', 'Paitan', date '2018-11-12', 'Parisan, Gedion Villanueva', 'Paitan, Ecel Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    -- Grade 2, Male (6)
    ('G2', '429507220001', 'M', 'Cabcaan', 'Marwin', 'Casula', date '2013-05-26', 'Cabcaan, Nico', 'Casula, Malyn Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507200001', 'M', 'Casula', 'Jonjon', 'Calve', date '2010-05-05', 'Casula, Lordan Villanueva', 'Calve, Ajie Cubil', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507220002', 'M', 'Casula', 'Junie', 'Calve', date '2014-06-09', 'Casula, Jordan', 'Calve, Ajie Cubil', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507210002', 'M', 'Colot', 'Rensel', 'Parisan', date '2013-11-13', 'Colot, Celon Parisan', 'Parisan, Irene Masaldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '169527230014', 'M', 'Tungkarawin', 'Jerico', 'Parisan', date '2017-10-15', 'Tungkarawin, Jerwin Liwayan', 'Parisan, Recca Masaldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Alipaoy, Paluan, Occidental Mindoro', 'Transferred in 2026-08-03'),
    ('G2', '429507210006', 'M', 'Villanueva', 'Angelo', 'Reyes', date '2013-02-04', 'Villanueva, Gary Parisan', 'Reyes, Mercing Balbas', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Grade 2, Female (11)
    ('G2', '110059230030', 'F', 'Balikadong', 'Elialyn', 'Parisan', date '2018-03-25', 'Balikadong, Elias Parisan', 'Parisan, Ailyn Masaldang', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Mananao, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('G2', '429507210001', 'F', 'Casula', 'Bimby', 'Parisan', date '2012-07-30', 'Casula, Amado Villanueva', 'Parisan, Lorna Casula', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507230001', 'F', 'Casula', 'Rachael', 'Sambutan', date '2015-04-08', 'Casula, Jerry Villanueva', 'Sambutan, Norma Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507230002', 'F', 'Casula', 'Sharon', 'Sambutan', date '2013-01-30', 'Casula, Jerry Villanueva', 'Sambutan, Norma Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507230003', 'F', 'Fajardo', 'Louise Lane', 'Parisan', date '2015-05-30', 'Fajardo, Losito Parisan', 'Parisan, Loida Calve', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507240005', 'F', 'Masaldang', 'Margelyn', 'Hinalman', date '2014-06-14', 'Masaldang, Nardo Villanueva', 'Hinalman, Rida Canuyan', 'Tagalog', 'Iraya', 'Christianity', 'Paluan, Occidental Mindoro', null),
    ('G2', '429507220003', 'F', 'Paitan', 'Dailyn', 'Casula', date '2012-06-08', 'Paitan, Jr Parisan', 'Casula, Letty Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507210007', 'F', 'Paitan', 'Meldie', 'Casula', date '2012-05-01', 'Paitan, Ricky Lagnaan', 'Casula, Rose Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507230004', 'F', 'Parisan', 'Erilyn', 'Sambutan', date '2012-12-17', 'Parisan, Ernie Paitan', 'Sambutan, Lea', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507240011', 'F', 'Parisan', 'Princes', 'Casula', date '2013-09-13', 'Parisan, Rody Parisan', 'Casula, Marie Villanueva', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G2', '429507210009', 'F', 'Tungkarawin', 'Carmina', null, date '2012-02-08', null, 'Tungkarawin, Laura Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Grade 3, Male (1)
    ('G3', '429507210004', 'M', 'Bunsuan', 'Dindo', 'Masaldang', date '2013-09-03', 'Bunsuan, Eric Dayungan', 'Masaldang, Lening Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Grade 3, Female (1)
    ('G3', '110050190007', 'F', 'Tungkarawin', 'Rebeca', 'Cubil', date '2010-04-29', 'Tungkarawin, Rey Panaligan', 'Cubil, Elda Liwayan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in 2026-08-03'),
    -- Grade 4, Male (3)
    ('G4', '429512190024', 'M', 'Casula', 'Reden', 'Sambutan', date '2010-11-17', 'Casula, Jerry Villanueva', 'Sambutan, Norma Sambutan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G4', '429507200002', 'M', 'Parisan', 'Dodot', 'Sambutan', date '2011-10-25', 'Parisan, Ernie Paitan', 'Sambutan, Lea', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G4', '429512190033', 'M', 'Parisan', 'Renjohn', 'Parisan', date '2010-05-22', 'Parisan, Rene Pandac', 'Villanueva, Delia Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Grade 4, Female (4)
    ('G4', '110050180015', 'F', 'Ferolino', 'Eunice', 'Salgarino', date '2012-12-13', 'Ferolino, Eduardo Batiancila', 'Salgarino, Maricel Batuhan', 'Tagalog', null, 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', 'Transferred in (pending, per SF1)'),
    ('G4', '429507210011', 'F', 'Mamildang', 'Briana', 'T.', date '2011-10-19', 'Mamildang, Efren', 'Tungkarawin, Thelma', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G4', '429507180008', 'F', 'Masaldang', 'Marilyn', 'Hinalman', date '2008-12-05', 'Masaldang, Nardo Villanueva', 'Hinalman, Rida Canuyan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G4', '429512190028', 'F', 'Villanueva', 'Veya', 'Reyes', date '2009-07-09', 'Villanueva, Gary Parisan', 'Reyes, Mercing Balbas', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    -- Grade 5, Female (2)
    ('G5', '429512190026', 'F', 'Bunsuan', 'Glorie', 'Masaldang', date '2011-01-05', 'Bunsuan, Eric Dayungan', 'Masaldang, Lening Parisan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null),
    ('G5', '429507200005', 'F', 'Paitan', 'Mary Joy', 'Parisan', date '2012-06-15', 'Paitan, Mario Casula', 'Parisan, Shirley Dayungan', 'Tagalog', 'Iraya', 'Christianity', 'Barangay Harrison, Paluan, Occidental Mindoro', null)
),
binuangan as (
  select id as school_id from schools where slug = 'binuangan'
),
inserted as (
  insert into students (
    school_id, current_grade_level_id, lrn, sex, first_name, middle_name, last_name,
    birthdate, father_name, mother_name, mother_tongue, ip_group, religion, home_address, notes, status
  )
  select
    b.school_id, gl.id, r.lrn, r.sex, r.first_name, r.middle_name, r.last_name,
    r.birthdate, r.father_name, r.mother_name, r.mother_tongue, r.ip_group, r.religion,
    r.home_address, r.notes, 'active'
  from roster r
  cross join binuangan b
  join grade_levels gl on gl.code = r.grade_code
  where not exists (
    select 1 from students s
    where s.lrn = r.lrn
       or (s.school_id = b.school_id
           and lower(s.first_name) = lower(r.first_name)
           and lower(s.last_name) = lower(r.last_name)
           and s.birthdate is not distinct from r.birthdate)
  )
  returning id, school_id, current_grade_level_id
)
insert into student_enrollments (student_id, school_id, grade_level_id, school_year_id)
select i.id, i.school_id, i.current_grade_level_id, sy.id
from inserted i
cross join (select id from school_years where is_current) sy
on conflict (student_id, school_year_id) do nothing;

-- What you should see: Binuangan's active students per class, and the
-- teacher each class belongs to.
select gl.name as "Grade", cs.name as "Class", count(distinct st.id) as "Students",
       coalesce(max(t.full_name), '— no teacher —') as "Teacher"
from students st
join schools s on s.id = st.school_id and s.slug = 'binuangan'
join grade_levels gl on gl.id = st.current_grade_level_id
left join class_sections cs on cs.id = st.section_id
left join class_subject_teachers cst on cst.section_id = cs.id
left join teachers t on t.id = cst.teacher_id
where st.status = 'active'
group by gl.name, gl.sort_order, cs.name
order by gl.sort_order, cs.name;
