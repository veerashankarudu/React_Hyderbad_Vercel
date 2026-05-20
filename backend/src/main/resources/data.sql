-- ============================================================
-- Smart Quiz AI Hub — Seed Data
-- This runs on startup (spring.sql.init.mode=always)
-- Uses INSERT IGNORE to be idempotent
-- ============================================================

-- Tech Stacks
INSERT IGNORE INTO tech_stacks (id, name) VALUES
  (1001, 'Spring Cloud'),
  (1002, 'Spring Boot'),
  (1003, 'Spring Core'),
  (1004, 'Spring MVC & REST'),
  (1005, 'Spring ORM & Data JPA'),
  (1006, 'Core Java');

-- Topics for Spring Cloud (spec-exact IDs and names)
INSERT IGNORE INTO topics (id, name, tech_stack_id) VALUES
  (1001, 'Introduction to Spring Cloud', 1001),
  (1002, 'Service Discovery design pattern – Eureka Server & Discovery Client', 1001),
  (1003, 'Eureka Heartbeats & Self Preservation', 1001),
  (1004, 'Spring Cloud Loadbalancer', 1001),
  (1005, 'Spring Cloud OpenFeign', 1001),
  (1006, 'Resilience4J- Circuit Breaker', 1001),
  (1007, 'Spring Boot Actuator', 1001);

-- Topics for Spring Boot
INSERT IGNORE INTO topics (name, tech_stack_id) VALUES
  ('Auto Configuration', 1002),
  ('Spring Boot Starters', 1002),
  ('Embedded Servers', 1002),
  ('Spring Boot Testing', 1002);

-- Topics for Spring Core
INSERT IGNORE INTO topics (name, tech_stack_id) VALUES
  ('Dependency Injection', 1003),
  ('Bean Lifecycle', 1003),
  ('Spring AOP', 1003),
  ('Application Context', 1003),
  ('Spring Events', 1003);

-- Topics for Spring MVC & REST
INSERT IGNORE INTO topics (name, tech_stack_id) VALUES
  ('REST Controllers', 1004),
  ('Exception Handling', 1004),
  ('Request Mapping & Params', 1004),
  ('Content Negotiation', 1004),
  ('Validation', 1004);

-- Topics for Spring ORM & Data JPA
INSERT IGNORE INTO topics (name, tech_stack_id) VALUES
  ('JPA Entities & Relationships', 1005),
  ('Spring Data Repositories', 1005),
  ('JPQL & Native Queries', 1005),
  ('Transactions', 1005),
  ('Pagination & Sorting', 1005);

-- Topics for Core Java
INSERT IGNORE INTO topics (name, tech_stack_id) VALUES
  ('Collections Framework', 1006),
  ('Concurrency & Multithreading', 1006),
  ('Java 8+ Features', 1006),
  ('Exception Handling', 1006),
  ('Design Patterns', 1006),
  ('JVM Internals', 1006);

-- Admin user: divya.madhanasekar / Admin@123
INSERT IGNORE INTO users (enterprise_id, full_name, email, password_hash, role) VALUES
  ('divya.madhanasekar', 'Divya Madhanasekar', 'divya.madhanasekar@accenture.com',
   '$2b$10$qjj/bDYNep1CvxZV3OznMelfjFqV7EmlzpbsUyR.OwUPpVbAS36Pm', 'ADMIN');

-- SME users: password for all is 'Sme@1234'
INSERT IGNORE INTO users (enterprise_id, full_name, email, password_hash, role) VALUES
  ('gaurav.a.bhola', 'Gaurav Bhola', 'gaurav.a.bhola@accenture.com',
   '$2b$10$ryi.AMMAW7q48FRt8kGlA.VINXqUS2JW/ump2apcVYoNZHUfwfvyy', 'SME'),
  ('birendra.kumar.singh', 'Birendra Kumar Singh', 'birendra.kumar.singh@accenture.com',
   '$2b$10$ryi.AMMAW7q48FRt8kGlA.VINXqUS2JW/ump2apcVYoNZHUfwfvyy', 'SME'),
  ('swati.avinash.nikam', 'Swati Nikam', 'swati.avinash.nikam@accenture.com',
   '$2b$10$ryi.AMMAW7q48FRt8kGlA.VINXqUS2JW/ump2apcVYoNZHUfwfvyy', 'SME'),
  ('indugu.hari.prasad', 'Indugu Hari Prasad', 'indugu.hari.prasad@accenture.com',
   '$2b$10$ryi.AMMAW7q48FRt8kGlA.VINXqUS2JW/ump2apcVYoNZHUfwfvyy', 'SME');

-- SME → Tech Stack mappings (spec-exact)
-- gaurav.a.bhola: Spring Cloud (1001), Spring Core (1003)
INSERT IGNORE INTO sme_tech_mapping (user_id, tech_stack_id)
  SELECT u.id, ts.id FROM users u, tech_stacks ts
  WHERE u.enterprise_id = 'gaurav.a.bhola' AND ts.id IN (1001, 1003);

-- birendra.kumar.singh: Spring Boot (1002)
INSERT IGNORE INTO sme_tech_mapping (user_id, tech_stack_id)
  SELECT u.id, ts.id FROM users u, tech_stacks ts
  WHERE u.enterprise_id = 'birendra.kumar.singh' AND ts.id IN (1002);

-- swati.avinash.nikam: Spring Boot (1002)
INSERT IGNORE INTO sme_tech_mapping (user_id, tech_stack_id)
  SELECT u.id, ts.id FROM users u, tech_stacks ts
  WHERE u.enterprise_id = 'swati.avinash.nikam' AND ts.id IN (1002);

-- indugu.hari.prasad: Spring Cloud (1001)
INSERT IGNORE INTO sme_tech_mapping (user_id, tech_stack_id)
  SELECT u.id, ts.id FROM users u, tech_stacks ts
  WHERE u.enterprise_id = 'indugu.hari.prasad' AND ts.id IN (1001);

-- divya.madhanasekar (ADMIN): Spring MVC & REST (1004), Spring Cloud (1001)
INSERT IGNORE INTO sme_tech_mapping (user_id, tech_stack_id)
  SELECT u.id, ts.id FROM users u, tech_stacks ts
  WHERE u.enterprise_id = 'divya.madhanasekar' AND ts.id IN (1001, 1004);

-- Enforce divya.madhanasekar is always ADMIN (idempotent)
UPDATE users SET role = 'ADMIN' WHERE enterprise_id = 'divya.madhanasekar';

-- Sample MCQs from spec (birendra.kumar.singh, Stack 1001, Topic 1001)
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 1001,
    'Alex is building a microservices-based system using Spring Boot. He wants features like centralized configuration, service discovery, and client-side load balancing without building everything from scratch. Which is the primary purpose of Spring Cloud?',
    'To replace Spring Boot completely',
    'To provide tools for building distributed systems and microservices',
    'To manage only database transactions',
    'To handle only UI development',
    'B', 'MEDIUM', 'READY_FOR_REVIEW',
    1001, 1001, u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'birendra.kumar.singh'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 1001);

INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 1002,
    'John has multiple instances of a service running dynamically in the cloud. He wants each service to automatically register itself and discover others without hardcoding URLs. Which component is used for this purpose?',
    'Spring MVC',
    'Eureka Server',
    'Hibernate',
    'Apache Tomcat',
    'B', 'MEDIUM', 'APPROVED',
    1001, 1001, u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'birendra.kumar.singh'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 1002);

-- Fix NULL version/timestamps on seeded MCQs (idempotent)
UPDATE mcqs SET version = 0, created_at = NOW(), updated_at = NOW() WHERE id IN (1001, 1002) AND version IS NULL;
