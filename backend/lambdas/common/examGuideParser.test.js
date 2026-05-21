/**
 * Unit tests for examGuideParser.js — parseDomains and parseServices functions.
 *
 * Uses a fixture that mirrors the structure of the SAA-C03 exam guide PDF text.
 * No actual PDF or AWS calls are made.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseDomains, parseServices } from './examGuideParser.js';

// ── SAA-C03 Fixture Text ──────────────────────────────────────────────────────
//
// This fixture reproduces the key structural patterns found in the AWS
// Solutions Architect Associate (SAA-C03) exam guide PDF:
//   - Domain headers with percentage weights
//   - Task Statement entries under each domain
//   - "In-scope AWS services and features" appendix section
//   - "Out-of-scope AWS services and features" appendix section

const SAA_C03_FIXTURE = `
AWS Certified Solutions Architect – Associate (SAA-C03) Exam Guide

Introduction
This exam guide includes weightings, test domains, and objectives for the exam.

Content Outline
This exam has the following content domains and weightings:
• Domain 1: Design Secure Architectures (30% of scored content)
• Domain 2: Design Resilient Architectures (26% of scored content)
• Domain 3: Design High-Performing Architectures (24% of scored content)
• Domain 4: Design Cost-Optimized Architectures (20% of scored content)

Domain 1: Design Secure Architectures
30%

Task Statement 1.1: Design secure access to AWS resources.
Knowledge of:
• Access controls and management across multiple accounts
• AWS federated access and identity services (for example, AWS Identity and Access Management (IAM), AWS IAM Identity Center)
• AWS global infrastructure (for example, Availability Zones, AWS Regions)
• AWS security best practices (for example, the principle of least privilege)
• The AWS shared responsibility model

Task Statement 1.2: Design secure workloads and applications.
Knowledge of:
• Application configuration and credentials security
• AWS service endpoints
• Control ports, protocols, and network traffic on AWS
• Secure application access
• Security services with appropriate use cases (for example, Amazon Cognito, Amazon GuardDuty, Amazon Macie)
• Threat vectors external to AWS (for example, DDoS, SQL injection)

Task Statement 1.3: Determine appropriate data security controls.
Knowledge of:
• Data access and governance
• Data recovery
• Data retention and classification
• Encryption and appropriate key management (for example, AWS Key Management Service (AWS KMS))

Domain 2: Design Resilient Architectures
26%

Task Statement 2.1: Design scalable and loosely coupled architectures.
Knowledge of:
• API creation and management (for example, Amazon API Gateway, REST API)
• AWS managed services with appropriate use cases (for example, AWS Transfer Family, Amazon Simple Queue Service (Amazon SQS), Secrets Manager)
• Caching strategies
• Design principles for microservices (for example, stateless workloads compared with stateful workloads)
• Event-driven architectures
• Horizontal scaling and vertical scaling
• How to appropriately use edge accelerators (for example, content delivery network (CDN))
• How to migrate applications into containers
• Load balancing concepts (for example, Application Load Balancer)
• Multi-tier architectures
• Queuing and messaging concepts (for example, publish/subscribe)
• Serverless technologies and patterns (for example, AWS Fargate, AWS Lambda)
• Storage types with associated characteristics (for example, object, file, block)
• The orchestration of containers (for example, Amazon Elastic Container Service (Amazon ECS), Amazon Elastic Kubernetes Service (Amazon EKS))
• When to use read replicas
• Workflow orchestration (for example, AWS Step Functions)

Task Statement 2.2: Design highly available and/or fault-tolerant architectures.
Knowledge of:
• AWS global infrastructure (for example, Availability Zones, AWS Regions, Amazon Route 53)
• AWS managed services with appropriate use cases (for example, Amazon Comprehend, Amazon Polly)
• Basic networking concepts (for example, route tables)
• Disaster recovery (DR) strategies (for example, backup and restore, pilot light, warm standby, active-active failover, recovery point objective (RPO), recovery time objective (RTO))
• Distributed design patterns
• Failover strategies
• Immutable infrastructure
• Load balancing concepts (for example, Application Load Balancer)
• Proxy concepts (for example, Amazon RDS Proxy)
• Service quotas and throttling (for example, how to configure the service quotas for a workload in a standby environment)
• Storage options and characteristics (for example, durability, replication)
• Workload visibility (for example, AWS X-Ray)

Domain 3: Design High-Performing Architectures
24%

Task Statement 3.1: Determine high-performing and/or scalable storage solutions.
Knowledge of:
• Hybrid storage solutions to meet business requirements
• Storage services with appropriate use cases (for example, Amazon S3, Amazon Elastic File System (Amazon EFS), Amazon Elastic Block Store (Amazon EBS))
• Storage types with associated characteristics (for example, object, file, block)

Task Statement 3.2: Design high-performing and elastic compute solutions.
Knowledge of:
• AWS compute services with appropriate use cases (for example, AWS Batch, Amazon EMR, AWS Fargate)
• Distributed computing concepts supported by AWS global infrastructure and edge services
• Queuing and messaging concepts (for example, publish/subscribe)
• Scalability capabilities with appropriate use cases (for example, Amazon EC2 Auto Scaling, AWS Auto Scaling)
• Serverless technologies and patterns (for example, Lambda, Fargate)
• The orchestration of containers (for example, ECS, EKS)

Task Statement 3.3: Determine high-performing database solutions.
Knowledge of:
• AWS global infrastructure (for example, Availability Zones, AWS Regions)
• Caching strategies and services (for example, Amazon ElastiCache)
• Data access patterns (for example, read-intensive compared with write-intensive)
• Database engines with appropriate use cases (for example, heterogeneous migrations, homogeneous migrations)
• Database replication (for example, read replicas)
• Database types and services (for example, serverless, relational, non-relational, in-memory)

Task Statement 3.4: Determine high-performing and/or scalable network architectures.
Knowledge of:
• Edge networking services with appropriate use cases (for example, Amazon CloudFront, AWS Global Accelerator)
• How to design network architecture (for example, subnet tiers, routing, IP addressing)
• Load balancing concepts (for example, Application Load Balancer)
• Network connection options (for example, AWS VPN, Direct Connect, AWS PrivateLink)

Task Statement 3.5: Determine high-performing data ingestion and transformation solutions.
Knowledge of:
• Data analytics and visualization services with appropriate use cases (for example, Amazon Athena, AWS Lake Formation, Amazon QuickSight)
• Data ingestion patterns (for example, frequency)
• Data transfer services with appropriate use cases (for example, AWS DataSync, AWS Storage Gateway)
• Data transformation services with appropriate use cases (for example, AWS Glue)
• Secure access to ingestion access points
• Sizes or speeds needed to meet business requirements
• Streaming data services with appropriate use cases (for example, Amazon Kinesis)

Domain 4: Design Cost-Optimized Architectures
20%

Task Statement 4.1: Design cost-optimized storage solutions.
Knowledge of:
• Access options (for example, an S3 bucket with Requester Pays object storage)
• AWS cost management service features (for example, cost allocation tags, multi-account billing)
• AWS cost management tools with appropriate use cases (for example, AWS Cost Explorer, AWS Budgets, AWS Cost and Usage Report)
• AWS storage services with appropriate use cases (for example, Amazon FSx, Amazon EFS, Amazon S3, Amazon EBS)
• Backup strategies
• Block storage options (for example, hard disk drive (HDD) volume types, solid state drive (SSD) volume types)
• Data lifecycles
• Hybrid storage options (for example, DataSync, Transfer Family, Storage Gateway)
• Storage access patterns
• Tiered storage options (for example, S3 Standard, S3 Standard-Infrequent Access (S3 Standard-IA), S3 One Zone-IA, S3 Glacier Instant Retrieval, S3 Glacier Flexible Retrieval, S3 Glacier Deep Archive, S3 Intelligent-Tiering)
• Storage types with associated characteristics (for example, object, file, block)

Task Statement 4.2: Design cost-optimized compute solutions.
Knowledge of:
• AWS cost management service features (for example, cost allocation tags, multi-account billing)
• AWS cost management tools with appropriate use cases (for example, Cost Explorer, AWS Budgets, AWS Cost and Usage Report)
• AWS global infrastructure (for example, Availability Zones, AWS Regions)
• AWS purchasing options (for example, Spot Instances, Reserved Instances, Savings Plans)
• Distributed compute strategies (for example, edge processing)
• Hybrid compute options (for example, AWS Outposts, AWS Snowball Edge)
• Instance types, families, and sizes (for example, memory optimized, compute optimized, virtualization)
• Optimization of compute utilization (for example, containers, serverless computing, microservices)
• Scaling strategies (for example, auto scaling, hibernation)

Task Statement 4.3: Design cost-optimized database solutions.
Knowledge of:
• AWS cost management service features (for example, cost allocation tags, multi-account billing)
• AWS cost management tools with appropriate use cases (for example, Cost Explorer, AWS Budgets, AWS Cost and Usage Report)
• Caching strategies
• Data retention policies
• Database capacity planning (for example, capacity units)
• Database connections and proxies
• Database engines with appropriate use cases (for example, heterogeneous migrations, homogeneous migrations)
• Database replication (for example, read replicas)
• Database types and services (for example, relational, non-relational, serverless, in-memory)

Task Statement 4.4: Design cost-optimized network architectures.
Knowledge of:
• AWS cost management service features (for example, cost allocation tags, multi-account billing)
• AWS cost management tools with appropriate use cases (for example, Cost Explorer, AWS Budgets, AWS Cost and Usage Report)
• Load balancing concepts (for example, Application Load Balancer)
• NAT gateways (for example, NAT instance costs compared with NAT gateway costs)
• Network connectivity (for example, private lines, dedicated lines, VPNs)
• Network routing, topology, and peering (for example, AWS Transit Gateway, VPC peering)
• Network services with appropriate use cases (for example, DNS)

Appendix

In-scope AWS services and features
The following list contains AWS services and features that are in scope for the exam.
This list is not exhaustive and is subject to change. AWS offerings in scope for the
latest version of this exam are based on commonly used services that a Solutions
Architect Associate would use.

Analytics:
Amazon Athena
Amazon EMR
AWS Glue
Amazon Kinesis
Amazon OpenSearch Service
Amazon QuickSight
Amazon Redshift

Application Integration:
Amazon EventBridge
Amazon Simple Notification Service (Amazon SNS)
Amazon Simple Queue Service (Amazon SQS)
AWS Step Functions

Business Applications:
Amazon Connect
Amazon Simple Email Service (Amazon SES)

Cloud Financial Management:
AWS Budgets
AWS Cost and Usage Report
AWS Cost Explorer
AWS Marketplace

Compute:
AWS Batch
Amazon EC2
Amazon EC2 Auto Scaling
AWS Elastic Beanstalk
AWS Fargate
AWS Lambda
Amazon Lightsail
AWS Outposts

Containers:
Amazon Elastic Container Registry (Amazon ECR)
Amazon Elastic Container Service (Amazon ECS)
Amazon Elastic Kubernetes Service (Amazon EKS)

Database:
Amazon Aurora
Amazon DynamoDB
Amazon ElastiCache
Amazon MemoryDB for Redis
Amazon Neptune
Amazon RDS
Amazon Redshift

Developer Tools:
AWS CodeBuild
AWS CodeCommit
AWS CodeDeploy
AWS CodePipeline

End User Computing:
Amazon AppStream 2.0
Amazon WorkSpaces

Front-End Web and Mobile:
AWS Amplify
Amazon API Gateway
AWS Device Farm
Amazon Pinpoint

Machine Learning:
Amazon Comprehend
Amazon Forecast
Amazon Fraud Detector
Amazon Kendra
Amazon Lex
Amazon Polly
Amazon Rekognition
Amazon SageMaker
Amazon Textract
Amazon Transcribe
Amazon Translate

Management and Governance:
AWS Auto Scaling
AWS CloudFormation
AWS CloudTrail
Amazon CloudWatch
AWS Config
AWS Control Tower
AWS Health Dashboard
AWS License Manager
Amazon Managed Grafana
AWS Organizations
AWS Service Catalog
AWS Systems Manager
AWS Trusted Advisor
AWS Well-Architected Tool

Media Services:
Amazon Elastic Transcoder
Amazon Kinesis Video Streams

Migration and Transfer:
AWS Application Discovery Service
AWS Application Migration Service
AWS Database Migration Service (AWS DMS)
AWS DataSync
AWS Migration Hub
AWS Snow Family
AWS Transfer Family

Networking and Content Delivery:
Amazon CloudFront
AWS Direct Connect
Elastic Load Balancing (ELB)
AWS Global Accelerator
AWS PrivateLink
Amazon Route 53
AWS Transit Gateway
Amazon VPC
AWS VPN

Security, Identity, and Compliance:
AWS Certificate Manager (ACM)
AWS CloudHSM
Amazon Cognito
AWS Directory Service
AWS Firewall Manager
Amazon GuardDuty
AWS IAM Identity Center
AWS Identity and Access Management (IAM)
Amazon Inspector
AWS Key Management Service (AWS KMS)
Amazon Macie
AWS Network Firewall
AWS Resource Access Manager (AWS RAM)
AWS Secrets Manager
AWS Security Hub
AWS Shield
AWS WAF

Serverless:
AWS AppSync
AWS Fargate
AWS Lambda

Storage:
AWS Backup
Amazon Elastic Block Store (Amazon EBS)
Amazon Elastic File System (Amazon EFS)
Amazon FSx
Amazon S3
Amazon S3 Glacier
AWS Storage Gateway

Out-of-scope AWS services and features
The following list contains AWS services and features that are out of scope for the exam.
Out-of-scope services are generally those that are not commonly used by a Solutions
Architect Associate or are highly specialized.

Analytics:
Amazon FinSpace
Amazon Lookout for Metrics

Business Applications:
Amazon Chime
Amazon Honeycode

Compute:
Amazon AppStream 2.0 (as a compute service)
AWS SimSpace Weaver

Database:
Amazon Timestream

Developer Tools:
AWS Cloud9
AWS CloudShell

End User Computing:
Amazon WorkDocs
Amazon WorkMail

Front-End Web and Mobile:
AWS Amplify Studio

IoT:
AWS IoT Analytics
AWS IoT Core
AWS IoT Device Defender
AWS IoT Device Management
AWS IoT Events
AWS IoT Greengrass
AWS IoT SiteWise
AWS IoT TwinMaker

Machine Learning:
Amazon Augmented AI (Amazon A2I)
Amazon CodeGuru
Amazon DevOps Guru
Amazon Lookout for Equipment
Amazon Lookout for Vision
Amazon Monitron
AWS Panorama

Management and Governance:
AWS Chatbot
AWS Proton

Media Services:
AWS Elemental MediaConnect
AWS Elemental MediaConvert
AWS Elemental MediaLive
AWS Elemental MediaPackage
AWS Elemental MediaStore
AWS Elemental MediaTailor
Amazon Interactive Video Service (Amazon IVS)

Migration and Transfer:
AWS Mainframe Modernization

Networking and Content Delivery:
AWS App Mesh
AWS Cloud Map

Robotics:
AWS RoboMaker

Satellite:
AWS Ground Station
`;

// ── parseDomains Tests ────────────────────────────────────────────────────────

describe('parseDomains', () => {
  it('extracts all 4 SAA-C03 domains', () => {
    const domains = parseDomains(SAA_C03_FIXTURE);
    assert.equal(domains.length, 4, `Expected 4 domains, got ${domains.length}`);
  });

  it('extracts correct domain names', () => {
    const domains = parseDomains(SAA_C03_FIXTURE);
    const names = domains.map((d) => d.name);
    assert.ok(
      names.some((n) => n.includes('Design Secure Architectures')),
      'Missing "Design Secure Architectures"'
    );
    assert.ok(
      names.some((n) => n.includes('Design Resilient Architectures')),
      'Missing "Design Resilient Architectures"'
    );
    assert.ok(
      names.some((n) => n.includes('Design High-Performing Architectures')),
      'Missing "Design High-Performing Architectures"'
    );
    assert.ok(
      names.some((n) => n.includes('Design Cost-Optimized Architectures')),
      'Missing "Design Cost-Optimized Architectures"'
    );
  });

  it('extracts correct domain weights', () => {
    const domains = parseDomains(SAA_C03_FIXTURE);
    const byName = Object.fromEntries(domains.map((d) => [d.name, d]));

    const secure = domains.find((d) => d.name.includes('Secure'));
    const resilient = domains.find((d) => d.name.includes('Resilient'));
    const highPerf = domains.find((d) => d.name.includes('High-Performing'));
    const costOpt = domains.find((d) => d.name.includes('Cost-Optimized'));

    assert.ok(secure, 'Secure domain not found');
    assert.ok(resilient, 'Resilient domain not found');
    assert.ok(highPerf, 'High-Performing domain not found');
    assert.ok(costOpt, 'Cost-Optimized domain not found');

    // Weights should be approximately correct (within 0.01 tolerance)
    assert.ok(
      Math.abs(secure.weight - 0.30) < 0.01,
      `Secure weight expected ~0.30, got ${secure.weight}`
    );
    assert.ok(
      Math.abs(resilient.weight - 0.26) < 0.01,
      `Resilient weight expected ~0.26, got ${resilient.weight}`
    );
    assert.ok(
      Math.abs(highPerf.weight - 0.24) < 0.01,
      `High-Performing weight expected ~0.24, got ${highPerf.weight}`
    );
    assert.ok(
      Math.abs(costOpt.weight - 0.20) < 0.01,
      `Cost-Optimized weight expected ~0.20, got ${costOpt.weight}`
    );
  });

  it('extracts task statements for Domain 1', () => {
    const domains = parseDomains(SAA_C03_FIXTURE);
    const domain1 = domains.find((d) => d.name.includes('Secure'));
    assert.ok(domain1, 'Domain 1 not found');
    assert.ok(
      domain1.task_statements.length >= 3,
      `Expected at least 3 task statements in Domain 1, got ${domain1.task_statements.length}`
    );
  });

  it('extracts task statement IDs correctly', () => {
    const domains = parseDomains(SAA_C03_FIXTURE);
    const domain1 = domains.find((d) => d.name.includes('Secure'));
    const ids = domain1.task_statements.map((ts) => ts.id);
    assert.ok(ids.includes('1.1'), `Expected task ID 1.1, got: ${ids.join(', ')}`);
    assert.ok(ids.includes('1.2'), `Expected task ID 1.2, got: ${ids.join(', ')}`);
    assert.ok(ids.includes('1.3'), `Expected task ID 1.3, got: ${ids.join(', ')}`);
  });

  it('extracts task statement text correctly', () => {
    const domains = parseDomains(SAA_C03_FIXTURE);
    const domain1 = domains.find((d) => d.name.includes('Secure'));
    const ts11 = domain1.task_statements.find((ts) => ts.id === '1.1');
    assert.ok(ts11, 'Task Statement 1.1 not found');
    assert.ok(
      ts11.text.includes('secure access'),
      `Task 1.1 text should mention "secure access", got: "${ts11.text}"`
    );
  });

  it('extracts task statements for Domain 4', () => {
    const domains = parseDomains(SAA_C03_FIXTURE);
    const domain4 = domains.find((d) => d.name.includes('Cost-Optimized'));
    assert.ok(domain4, 'Domain 4 not found');
    assert.ok(
      domain4.task_statements.length >= 4,
      `Expected at least 4 task statements in Domain 4, got ${domain4.task_statements.length}`
    );
    const ids = domain4.task_statements.map((ts) => ts.id);
    assert.ok(ids.includes('4.1'), `Expected task ID 4.1`);
    assert.ok(ids.includes('4.4'), `Expected task ID 4.4`);
  });

  it('returns empty array for text with no domain headers', () => {
    const domains = parseDomains('This text has no domain headers at all.');
    assert.equal(domains.length, 0);
  });

  it('task_statements is always an array', () => {
    const domains = parseDomains(SAA_C03_FIXTURE);
    for (const domain of domains) {
      assert.ok(
        Array.isArray(domain.task_statements),
        `task_statements should be an array for domain "${domain.name}"`
      );
    }
  });

  it('each task statement has id, text, and services fields', () => {
    const domains = parseDomains(SAA_C03_FIXTURE);
    for (const domain of domains) {
      for (const ts of domain.task_statements) {
        assert.ok(typeof ts.id === 'string', `task id should be string, got ${typeof ts.id}`);
        assert.ok(typeof ts.text === 'string', `task text should be string`);
        assert.ok(Array.isArray(ts.services), `task services should be array`);
      }
    }
  });
});

// ── parseServices Tests ───────────────────────────────────────────────────────

describe('parseServices', () => {
  it('extracts in-scope services', () => {
    const { inScope } = parseServices(SAA_C03_FIXTURE);
    assert.ok(
      inScope.length > 0,
      'Expected at least one in-scope service'
    );
  });

  it('extracts out-of-scope services', () => {
    const { inScope, outOfScope } = parseServices(SAA_C03_FIXTURE);
    assert.ok(
      outOfScope.length > 0,
      'Expected at least one out-of-scope service'
    );
  });

  it('includes well-known SAA-C03 in-scope services', () => {
    const { inScope } = parseServices(SAA_C03_FIXTURE);
    const inScopeLower = inScope.map((s) => s.toLowerCase());

    const expected = ['amazon s3', 'amazon ec2', 'amazon rds', 'amazon dynamodb', 'aws lambda'];
    for (const svc of expected) {
      assert.ok(
        inScopeLower.some((s) => s.includes(svc.toLowerCase())),
        `Expected in-scope service "${svc}" not found. Got: ${inScope.slice(0, 10).join(', ')}`
      );
    }
  });

  it('includes well-known SAA-C03 out-of-scope services', () => {
    const { outOfScope } = parseServices(SAA_C03_FIXTURE);
    const outOfScopeLower = outOfScope.map((s) => s.toLowerCase());

    // AWS IoT Core and Amazon Timestream are listed as out-of-scope in SAA-C03
    const expected = ['amazon timestream', 'aws iot core'];
    for (const svc of expected) {
      assert.ok(
        outOfScopeLower.some((s) => s.includes(svc.toLowerCase())),
        `Expected out-of-scope service "${svc}" not found. Got: ${outOfScope.slice(0, 10).join(', ')}`
      );
    }
  });

  it('in-scope and out-of-scope lists are disjoint', () => {
    const { inScope, outOfScope } = parseServices(SAA_C03_FIXTURE);
    const inScopeSet = new Set(inScope.map((s) => s.toLowerCase()));
    const overlap = outOfScope.filter((s) => inScopeSet.has(s.toLowerCase()));
    assert.equal(
      overlap.length,
      0,
      `Services appear in both lists: ${overlap.join(', ')}`
    );
  });

  it('returns empty arrays for text with no service sections', () => {
    const { inScope, outOfScope } = parseServices('No service sections here.');
    assert.deepEqual(inScope, []);
    assert.deepEqual(outOfScope, []);
  });

  it('returns empty out-of-scope list when section is absent (Req 8.3)', () => {
    // Text with only an in-scope section, no out-of-scope section
    const textWithoutOutOfScope = `
In-scope AWS services and features
Amazon S3
Amazon EC2
AWS Lambda
`;
    const { inScope, outOfScope } = parseServices(textWithoutOutOfScope);
    assert.ok(inScope.length > 0, 'Should still parse in-scope services');
    assert.deepEqual(outOfScope, [], 'Out-of-scope should be empty when section is absent');
  });

  it('inScope and outOfScope are always arrays', () => {
    const result = parseServices(SAA_C03_FIXTURE);
    assert.ok(Array.isArray(result.inScope), 'inScope should be an array');
    assert.ok(Array.isArray(result.outOfScope), 'outOfScope should be an array');
  });

  it('service names are non-empty strings', () => {
    const { inScope, outOfScope } = parseServices(SAA_C03_FIXTURE);
    for (const svc of [...inScope, ...outOfScope]) {
      assert.ok(typeof svc === 'string', `Service should be string, got ${typeof svc}`);
      assert.ok(svc.trim().length > 0, 'Service name should not be empty');
    }
  });

  it('extracts a reasonable number of in-scope services for SAA-C03', () => {
    const { inScope } = parseServices(SAA_C03_FIXTURE);
    // SAA-C03 has ~100+ in-scope services; fixture has ~80
    assert.ok(
      inScope.length >= 30,
      `Expected at least 30 in-scope services, got ${inScope.length}`
    );
  });
});
