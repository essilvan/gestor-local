-- Migração: Adiciona campo de instagram à tabela prospects
ALTER TABLE IF EXISTS prospects ADD COLUMN IF NOT EXISTS instagram text;
