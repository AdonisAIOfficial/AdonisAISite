User table:
                                   
                                   Table "public.users"
         Column          |          Type          | Collation | Nullable |     Default
-------------------------+------------------------+-----------+----------+-----------------
 email                   | character varying(255) |           | not null |
 chat                    | text[]                 |           |          | ARRAY[]::text[]
 stats                   | jsonb                  |           |          | '{}'::jsonb
 access_token            | character varying(255) |           |          |
 access_token_created_on | character varying(8)   |           |          |
 password                | character varying(255) |           |          |
Indexes:
    "users_pkey" PRIMARY KEY, btree (email)