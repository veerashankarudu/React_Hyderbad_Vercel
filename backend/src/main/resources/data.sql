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

-- ============================================================
-- DEMO-READY MCQs for Semantic Duplicate Detection showcase
-- These questions are designed so typing similar questions
-- during the demo triggers the AI duplicate detection.
-- ============================================================

-- Spring Core: Dependency Injection (tech_stack_id=1003)
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2001,
    'What is Dependency Injection in Spring and how does it promote loose coupling between components?',
    'It is a design pattern where objects create their own dependencies',
    'It is a mechanism where the Spring container provides required dependencies to a class at runtime',
    'It means using static methods for all service calls',
    'It refers to importing external JAR files into the project',
    'B', 'MEDIUM', 'APPROVED',
    1003, (SELECT id FROM topics WHERE name='Dependency Injection' AND tech_stack_id=1003 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'birendra.kumar.singh'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2001);

-- Spring Core: Dependency Injection — different angle (IoC)
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2002,
    'How does the Spring IoC container manage object creation and inject dependencies into beans?',
    'By reading XML or annotations and instantiating beans with their required dependencies automatically',
    'By requiring developers to manually instantiate every object using new keyword',
    'By using static factory methods exclusively',
    'By loading all classes into memory at compile time',
    'A', 'MEDIUM', 'APPROVED',
    1003, (SELECT id FROM topics WHERE name='Dependency Injection' AND tech_stack_id=1003 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'birendra.kumar.singh'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2002);

-- Spring Core: @Autowired annotation
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2003,
    'What is the purpose of the @Autowired annotation in Spring Framework?',
    'It marks a class as a REST controller',
    'It automatically injects the required dependency bean into the annotated field, constructor, or setter',
    'It enables transaction management for the annotated method',
    'It configures the application port number',
    'B', 'EASY', 'APPROVED',
    1003, (SELECT id FROM topics WHERE name='Dependency Injection' AND tech_stack_id=1003 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'birendra.kumar.singh'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2003);

-- Spring Core: Bean Lifecycle
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2004,
    'What are the main phases in the lifecycle of a Spring Bean from creation to destruction?',
    'Compile → Deploy → Run → Stop',
    'Instantiation → Dependency Injection → Initialization (@PostConstruct) → Usage → Destruction (@PreDestroy)',
    'Load → Execute → Return → Garbage Collect',
    'Parse → Validate → Store → Delete',
    'B', 'MEDIUM', 'APPROVED',
    1003, (SELECT id FROM topics WHERE name='Bean Lifecycle' AND tech_stack_id=1003 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'birendra.kumar.singh'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2004);

-- Spring Core: AOP
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2005,
    'What is Aspect-Oriented Programming (AOP) in Spring and what problems does it solve?',
    'AOP is a way to write SQL queries using aspects',
    'AOP allows separating cross-cutting concerns like logging, security, and transactions from business logic using pointcuts and advice',
    'AOP replaces object-oriented programming entirely',
    'AOP is used only for unit testing Spring applications',
    'B', 'MEDIUM', 'APPROVED',
    1003, (SELECT id FROM topics WHERE name='Spring AOP' AND tech_stack_id=1003 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'birendra.kumar.singh'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2005);

-- Spring Boot: Auto Configuration
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2006,
    'How does Spring Boot auto-configuration work and which annotation enables it?',
    '@EnableAutoConfiguration or @SpringBootApplication triggers classpath scanning to auto-configure beans based on available libraries',
    '@AutoConfig annotation manually configures each bean',
    'Auto-configuration only works with XML-based configuration',
    'It requires explicit bean definitions for every component',
    'A', 'MEDIUM', 'APPROVED',
    1002, (SELECT id FROM topics WHERE name='Auto Configuration' AND tech_stack_id=1002 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'birendra.kumar.singh'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2006);

-- Spring Boot: Starters
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2007,
    'What are Spring Boot Starters and why are they useful for developers?',
    'Starters are pre-packaged dependency descriptors that bundle related libraries together, reducing manual dependency management',
    'Starters are IDE plugins for generating boilerplate code',
    'Starters are runtime servers that host Spring applications',
    'Starters are testing frameworks built into Spring',
    'A', 'EASY', 'APPROVED',
    1002, (SELECT id FROM topics WHERE name='Spring Boot Starters' AND tech_stack_id=1002 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'birendra.kumar.singh'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2007);

-- Spring MVC: REST Controllers
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2008,
    'What is the difference between @Controller and @RestController in Spring MVC?',
    '@RestController combines @Controller and @ResponseBody, automatically serializing return values to JSON/XML',
    'There is no difference — they are aliases',
    '@Controller handles REST while @RestController handles HTML views',
    '@RestController can only return String responses',
    'A', 'EASY', 'APPROVED',
    1004, (SELECT id FROM topics WHERE name='REST Controllers' AND tech_stack_id=1004 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'divya.madhanasekar'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2008);

-- Spring ORM: JPA Entities
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2009,
    'What is JPA (Java Persistence API) and how does Hibernate implement it for ORM?',
    'JPA is a specification for object-relational mapping; Hibernate is its most popular implementation that maps Java objects to database tables',
    'JPA is a database server; Hibernate is a connection pool',
    'JPA handles only SQL queries; Hibernate only handles NoSQL',
    'JPA and Hibernate are completely unrelated frameworks',
    'A', 'MEDIUM', 'APPROVED',
    1005, (SELECT id FROM topics WHERE name='JPA Entities & Relationships' AND tech_stack_id=1005 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'divya.madhanasekar'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2009);

-- Core Java: Polymorphism
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2010,
    'What is runtime polymorphism in Java and how is it achieved through method overriding?',
    'Runtime polymorphism means the JVM decides which overridden method to call based on the actual object type at runtime',
    'It means using method overloading with different parameter types',
    'It refers to using generic types in collections',
    'It is achieved by declaring methods as static',
    'A', 'MEDIUM', 'APPROVED',
    1006, (SELECT id FROM topics WHERE name='Java 8+ Features' AND tech_stack_id=1006 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'divya.madhanasekar'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2010);

-- Core Java: Collections
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2011,
    'What is the difference between HashMap and ConcurrentHashMap in Java Collections?',
    'HashMap is not thread-safe while ConcurrentHashMap allows concurrent read/write operations using segment-level locking',
    'They are identical in functionality and thread-safety',
    'HashMap is faster because it uses linked lists only',
    'ConcurrentHashMap does not allow null keys or values, but they are otherwise the same',
    'A', 'HARD', 'APPROVED',
    1006, (SELECT id FROM topics WHERE name='Collections Framework' AND tech_stack_id=1006 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'divya.madhanasekar'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2011);

-- Core Java: Multithreading
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2012,
    'How do you create a thread in Java and what is the difference between extending Thread class vs implementing Runnable?',
    'Implementing Runnable is preferred because Java supports single inheritance, so extending Thread blocks extending other classes',
    'Extending Thread is always better because it has more methods',
    'There is no difference — both approaches are identical',
    'Runnable can only be used with ExecutorService, not with Thread directly',
    'A', 'EASY', 'APPROVED',
    1006, (SELECT id FROM topics WHERE name='Concurrency & Multithreading' AND tech_stack_id=1006 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'divya.madhanasekar'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2012);

-- Spring ORM: Transactions
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2013,
    'What does the @Transactional annotation do in Spring and how does it manage database transactions?',
    'It marks a method or class so Spring wraps it in a transaction — auto-committing on success and rolling back on RuntimeException',
    'It creates a new database connection for every method call',
    'It only works with MongoDB, not relational databases',
    'It disables caching for the annotated method',
    'A', 'MEDIUM', 'APPROVED',
    1005, (SELECT id FROM topics WHERE name='Transactions' AND tech_stack_id=1005 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'divya.madhanasekar'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2013);

-- Spring Boot: Embedded Servers
INSERT IGNORE INTO mcqs (id, question_stem, option_a, option_b, option_c, option_d, correct_answer, difficulty, status, tech_stack_id, topic_id, creator_id, version, created_at, updated_at)
  SELECT 2014,
    'What is an embedded server in Spring Boot and why does it eliminate the need for external application server deployment?',
    'Spring Boot packages Tomcat/Jetty/Undertow inside the JAR so the app runs standalone without installing a separate server',
    'An embedded server means the database is inside the application',
    'It means Spring Boot apps cannot be deployed to external servers',
    'Embedded servers only support HTTP, not HTTPS',
    'A', 'EASY', 'APPROVED',
    1002, (SELECT id FROM topics WHERE name='Embedded Servers' AND tech_stack_id=1002 LIMIT 1),
    u.id, 0, NOW(), NOW()
  FROM users u WHERE u.enterprise_id = 'birendra.kumar.singh'
  AND NOT EXISTS (SELECT 1 FROM mcqs WHERE id = 2014);

-- Fix NULL version/timestamps on seeded MCQs (idempotent)
UPDATE mcqs SET version = 0, created_at = NOW(), updated_at = NOW() WHERE id IN (1001, 1002, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014) AND version IS NULL;

-- Assign reviewers to APPROVED/READY_FOR_REVIEW MCQs (idempotent)
-- MCQs created by birendra → reviewed by swati
UPDATE mcqs SET reviewer_id = (SELECT id FROM users WHERE enterprise_id = 'swati.avinash.nikam')
  WHERE id IN (1001, 1002, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2014)
  AND reviewer_id IS NULL AND status IN ('APPROVED', 'READY_FOR_REVIEW');

-- MCQs created by divya → reviewed by indugu
UPDATE mcqs SET reviewer_id = (SELECT id FROM users WHERE enterprise_id = 'indugu.hari.prasad')
  WHERE id IN (2008, 2009, 2010, 2011, 2012, 2013)
  AND reviewer_id IS NULL AND status IN ('APPROVED', 'READY_FOR_REVIEW');
