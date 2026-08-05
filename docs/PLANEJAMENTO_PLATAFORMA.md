# Planejamento Futuro da Plataforma (Roadmap)

Este documento guarda as diretrizes arquiteturais para a evolução do sistema de inscrições de corridas para uma plataforma multi-cliente (Marketplace).

## 1. Segurança e Proteção de Dados (Anti-Hack)
Devido ao alto volume de transações financeiras e ao armazenamento de PII (Personally Identifiable Information, como CPFs e E-mails), o sistema receberá as seguintes proteções:
- **Rate Limit:** Implementação de limite de tentativas de login para barrar ataques de força bruta contra senhas de painéis e de atletas.
- **Webhook Blindado (HMAC):** Validação criptográfica do cabeçalho `x-signature` do Mercado Pago, garantindo que o servidor só processe confirmações de pagamento genuínas, tornando impossível a injeção de pagamentos falsos.
- **Sessões Isoladas:** Abolir a senha simples global no lado da API, migrando o controle para JWT (JSON Web Tokens) ou Supabase Auth para restringir quem vê o quê.
- **Varredura de Envs:** Garantir que nenhuma credencial crítica (como `SUPABASE_SERVICE_ROLE_KEY`) seja exportada para o navegador do cliente.

## 2. Motor de Pagamentos (Marketplace & Split)
O site deixará de ser mono-evento (1 recebedor) e passará a atuar como **Empresa de Hospedagem (Plataforma)** utilizando o Mercado Pago OAuth. O dinheiro nunca ficará parado na conta da plataforma para evitar bitributação.

**Configuração dos 4 Casos de Negócio:**
1. **Taxa Repassada:** O organizador recebe R$ 100, a plataforma cobra R$ 10. O site soma o valor e o atleta paga R$ 110. (O MP debita 110 do cliente, deposita 100 na conta do organizador e 10 na da plataforma).
2. **Taxa Absorvida:** O ingresso é R$ 100, o atleta paga R$ 100. (O MP debita 100 do cliente, deposita 90 na conta do organizador e 10 na da plataforma).
3. **Isenção de Taxa da Plataforma:** O ingresso é R$ 100, o atleta paga R$ 100. A taxa da plataforma é 0 (O organizador fica com 100).
4. **Gratuidade Total:** Preço 0. A inscrição é validada instantaneamente no banco de dados sem acionar a API de pagamentos.

## 3. Níveis de Acesso (Controle Baseado em Papéis - RBAC)
Para gerenciar a plataforma com segurança, o acesso administrativo será dividido em 3 camadas:

- **👑 Nível 1: Dono (Acesso Total / Plataforma)**
  - O proprietário da plataforma.
  - Tem visão geral de tudo: pode criar, deletar e modificar todos os eventos.
  - Vê todos os valores financeiros, arrecadação total de cada evento e total de taxas arrecadadas pela empresa.
  - Pode configurar qual será a regra de divisão (os 4 casos acima) para cada organizador.

- **💼 Nível 2: Organizador (Acesso do Cliente da Empresa)**
  - O dono do evento em questão.
  - Só enxerga os PRÓPRIOS eventos.
  - Tem acesso aos dados financeiros do evento dele (ex: quanto dinheiro arrecadou, painel de vendas).
  - Vê os dados dos inscritos (exportar lista, aprovar reembolso).

- **🛡️ Nível 3: ADM do Evento (Staff / Controle de Acesso)**
  - A equipe que trabalha no dia do evento (staff, coordenadores de kit).
  - Pode apenas visualizar a tabela de inscritos para realizar check-in, buscar nomes, conferir tamanho de camisetas e categorias.
  - **Não tem acesso** a valores financeiros, extratos bancários, nem configurações de taxas.
