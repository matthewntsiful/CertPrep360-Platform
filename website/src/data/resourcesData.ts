
export interface ResourceLink {
  title: string;
  url: string;
  type: 'guide' | 'course' | 'doc' | 'official';
  description?: string;
}

export interface DomainWeight {
  name: string;
  percent: number;
}

export interface CertResources {
  certId: string;
  title: string;
  code: string;
  level: string;
  summary: string;
  fee: string;
  duration: string;
  passingScore: string;
  officialLinks: ResourceLink[];
  domains: DomainWeight[];
}

export const RESOURCES_DATA: Record<string, CertResources> = {
  'clf-c02': {
    certId: 'clf-c02',
    title: 'Cloud Practitioner',
    code: 'CLF-C02',
    level: 'Foundational',
    summary: 'Validates overall understanding of the AWS Cloud platform, covering basic cloud concepts and security.',
    fee: '$100',
    duration: '90 Minutes',
    passingScore: '70%',
    officialLinks: [
      { title: 'Exam Guide PDF', url: 'https://d1.awsstatic.com/training-and-certification/docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf', type: 'guide' },
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/', type: 'official' }
    ],
    domains: [
      { name: 'Cloud Concepts', percent: 24 },
      { name: 'Security and Compliance', percent: 30 },
      { name: 'Cloud Technology and Services', percent: 34 },
      { name: 'Billing, Pricing, and Support', percent: 12 }
    ]
  },
  'aif-c01': {
    certId: 'aif-c01',
    title: 'AI Practitioner',
    code: 'AIF-C01',
    level: 'Foundational',
    summary: 'Demonstrates a broad understanding of AI, Machining Learning, and Generative AI concepts on AWS.',
    fee: '$100',
    duration: '90 Minutes',
    passingScore: '70%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-ai-practitioner/', type: 'official' }
    ],
    domains: [
      { name: 'Fundamentals of AI and ML', percent: 20 },
      { name: 'Fundamentals of Generative AI', percent: 24 },
      { name: 'Applications of Foundation Models', percent: 28 },
      { name: 'Guidelines for Responsible AI', percent: 14 },
      { name: 'Security, Compliance, and Governance', percent: 14 }
    ]
  },
  'saa-c03': {
    certId: 'saa-c03',
    title: 'Solutions Architect',
    code: 'SAA-C03',
    level: 'Associate',
    summary: 'Validates the ability to design secure, resilient, and cost-optimized distributed systems on AWS.',
    fee: '$150',
    duration: '130 Minutes',
    passingScore: '72%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/', type: 'official' }
    ],
    domains: [
      { name: 'Design Secure Architectures', percent: 30 },
      { name: 'Design Resilient Architectures', percent: 26 },
      { name: 'Design High-Performing Architectures', percent: 24 },
      { name: 'Design Cost-Optimized Architectures', percent: 20 }
    ]
  },
  'dva-c02': {
    certId: 'dva-c02',
    title: 'Developer Associate',
    code: 'DVA-C02',
    level: 'Associate',
    summary: 'Validates expertise in developing, deploying, and debugging cloud-based applications using AWS.',
    fee: '$150',
    duration: '130 Minutes',
    passingScore: '72%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-developer-associate/', type: 'official' }
    ],
    domains: [
      { name: 'Development with AWS Services', percent: 32 },
      { name: 'Security', percent: 26 },
      { name: 'Deployment', percent: 24 },
      { name: 'Troubleshooting & Optimization', percent: 18 }
    ]
  },
  'soa-c02': {
    certId: 'soa-c02',
    title: 'SysOps Administrator',
    code: 'SOA-C02',
    level: 'Associate',
    summary: 'Validates experience in deploying, managing, and operating workloads on AWS.',
    fee: '$150',
    duration: '130 Minutes',
    passingScore: '72%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-sysops-admin-associate/', type: 'official' }
    ],
    domains: [
      { name: 'Monitoring, Logging, and Remediation', percent: 20 },
      { name: 'Reliability and Business Continuity', percent: 16 },
      { name: 'Deployment, Provisioning, and Automation', percent: 18 },
      { name: 'Security and Compliance', percent: 16 },
      { name: 'Networking and Content Delivery', percent: 18 },
      { name: 'Cost and Performance Optimization', percent: 12 }
    ]
  },
  'coe-c01': {
    certId: 'coe-c01',
    title: 'CloudOps Engineer',
    code: 'COE-C01',
    level: 'Associate',
    summary: 'Validates expertise in automating, managing, and operating cloud systems effectively.',
    fee: '$150',
    duration: '130 Minutes',
    passingScore: '72%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-sysops-admin-associate/', type: 'official' }
    ],
    domains: [
      { name: 'Monitoring, Logging, and Remediation', percent: 20 },
      { name: 'Reliability and Business Continuity', percent: 16 },
      { name: 'Deployment, Provisioning, and Automation', percent: 18 },
      { name: 'Security and Compliance', percent: 16 },
      { name: 'Networking and Content Delivery', percent: 18 },
      { name: 'Cost and Performance Optimization', percent: 12 }
    ]
  },
  'dea-c01': {
    certId: 'dea-c01',
    title: 'Data Engineer',
    code: 'DEA-C01',
    level: 'Associate',
    summary: 'Validates ability to implement data pipelines, manage data stores, and optimize data processing.',
    fee: '$150',
    duration: '130 Minutes',
    passingScore: '72%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-data-engineer-associate/', type: 'official' }
    ],
    domains: [
      { name: 'Data Ingestion and Transformation', percent: 34 },
      { name: 'Data Store Management', percent: 26 },
      { name: 'Data Operations and Support', percent: 22 },
      { name: 'Data Security and Governance', percent: 18 }
    ]
  },
  'mle-c01': {
    certId: 'mle-c01',
    title: 'Machine Learning Engineer',
    code: 'MLE-C01',
    level: 'Associate',
    summary: 'Validates ability to build, train, and deploy machine learning models on AWS.',
    fee: '$150',
    duration: '130 Minutes',
    passingScore: '72%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/', type: 'official' }
    ],
    domains: [
      { name: 'Data Preparation for ML', percent: 28 },
      { name: 'ML Model Development', percent: 26 },
      { name: 'ML Implementation and Operations', percent: 28 },
      { name: 'AI Solutions and Safety', percent: 18 }
    ]
  },
  'sap-c02': {
    certId: 'sap-c02',
    title: 'Solutions Architect Professional',
    code: 'SAP-C02',
    level: 'Professional',
    summary: 'Validates advanced technical skills and experience in designing optimized AWS solutions.',
    fee: '$300',
    duration: '180 Minutes',
    passingScore: '75%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-solutions-architect-professional/', type: 'official' }
    ],
    domains: [
      { name: 'Design for Organizational Complexity', percent: 26 },
      { name: 'Design for New Solutions', percent: 29 },
      { name: 'Continuous Improvement', percent: 25 },
      { name: 'Migration and Modernization', percent: 20 }
    ]
  },
  'dop-c02': {
    certId: 'dop-c02',
    title: 'DevOps Engineer Professional',
    code: 'DOP-C02',
    level: 'Professional',
    summary: 'Validates technical expertise in provisioning, operating, and managing distributed systems.',
    fee: '$300',
    duration: '180 Minutes',
    passingScore: '75%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-devops-engineer-professional/', type: 'official' }
    ],
    domains: [
      { name: 'SDLC Automation', percent: 22 },
      { name: 'Configuration Management & IaC', percent: 17 },
      { name: 'Resiliency and Recovery', percent: 15 },
      { name: 'Incident and Event Response', percent: 14 },
      { name: 'Monitoring and Logging', percent: 17 },
      { name: 'Security and Compliance', percent: 15 }
    ]
  },
  'gdp-c01': {
    certId: 'gdp-c01',
    title: 'Generative AI Developer',
    code: 'AIP-C01',
    level: 'Professional',
    summary: 'Validates ability to architect, implement, and optimize generative AI systems on AWS.',
    fee: '$300',
    duration: '180 Minutes',
    passingScore: '75%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-generative-ai-developer-professional/', type: 'official' }
    ],
    domains: [
      { name: 'Foundation Model Integration', percent: 31 },
      { name: 'Implementation and Integration', percent: 26 },
      { name: 'AI Safety, Security, and Governance', percent: 20 },
      { name: 'Operational Efficiency', percent: 12 },
      { name: 'Testing and Validation', percent: 11 }
    ]
  },
  'ans-c01': {
    certId: 'ans-c01',
    title: 'Advanced Networking Specialty',
    code: 'ANS-C01',
    level: 'Specialty',
    summary: 'Validates expertise in designing and maintaining complex hybrid networking architectures.',
    fee: '$300',
    duration: '170 Minutes',
    passingScore: '75%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-advanced-networking-specialty/', type: 'official' }
    ],
    domains: [
      { name: 'Network Design', percent: 30 },
      { name: 'Network Implementation', percent: 26 },
      { name: 'Network Management', percent: 20 },
      { name: 'Security, Compliance, and Governance', percent: 24 }
    ]
  },
  'scs-c02': {
    certId: 'scs-c02',
    title: 'Security Specialty',
    code: 'SCS-C02',
    level: 'Specialty',
    summary: 'Validates expertise in securing data and workloads in the AWS Cloud.',
    fee: '$300',
    duration: '170 Minutes',
    passingScore: '75%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-security-specialty/', type: 'official' }
    ],
    domains: [
      { name: 'Threat Detection & Incident Response', percent: 14 },
      { name: 'Infrastructure Security', percent: 20 },
      { name: 'IAM', percent: 16 },
      { name: 'Data Protection', percent: 18 },
      { name: 'Security Governance', percent: 32 }
    ]
  },
  'mls-c01': {
    certId: 'mls-c01',
    title: 'Machine Learning Specialty',
    code: 'MLS-C01',
    level: 'Specialty',
    summary: 'Validates expertise in building, deploying, and maintaining ML solutions on AWS.',
    fee: '$300',
    duration: '170 Minutes',
    passingScore: '75%',
    officialLinks: [
      { title: 'Official Certification Page', url: 'https://aws.amazon.com/certification/certified-machine-learning-specialty/', type: 'official' }
    ],
    domains: [
      { name: 'Data Engineering', percent: 20 },
      { name: 'Exploratory Data Analysis', percent: 24 },
      { name: 'Modeling', percent: 36 },
      { name: 'ML Operations', percent: 20 }
    ]
  }
};
