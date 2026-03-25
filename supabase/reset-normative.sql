-- ============================================================
-- RESET normative_sources
-- Cancella i record inutili (homepage, contatti) e prepara
-- per il seed con dati normativi reali.
-- Esegui su Supabase → SQL Editor PRIMA del seed.
-- ============================================================

-- Conta cosa c'è ora (per verifica)
SELECT categoria, COUNT(*) as n, AVG(LENGTH(contenuto))::int as chars_medi
FROM normative_sources
GROUP BY categoria
ORDER BY categoria;

-- Cancella TUTTO — i record attuali sono homepage e pagine contatti, non normative
DELETE FROM normative_sources;

-- Verifica pulizia
SELECT COUNT(*) as rimasti FROM normative_sources;

-- Dopo questo script lancia il seed:
--   npm run seed:normative
-- oppure via curl (dev):
--   curl -X POST http://localhost:3000/api/cron/weekly \
--     -H "Authorization: Bearer TUO_CRON_SECRET"