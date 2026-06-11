-- Cria o banco de staging no primeiro start do container Postgres.
-- O POSTGRES_DB já cria o banco principal (chilli); este script adiciona o segundo.
-- Roda apenas quando o volume chilli_pgdata está vazio.

CREATE DATABASE chilli_staging;
