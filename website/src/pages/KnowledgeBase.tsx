import { motion } from 'framer-motion';
import { BookOpen, Cloud, Database, Network, Shield, Server, Lock, Layers, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const articles = [
  {
    icon: Cloud,
    category: 'Compute',
    title: 'EC2 Instance Types Deep Dive',
    description: 'Understand the full spectrum of EC2 families — General Purpose, Compute Optimized, Memory Optimized, and Accelerated Computing — and when to use each for SAA-C03.',
    tags: ['EC2', 'Compute', 'SAA-C03'],
    readTime: '8 min',
  },
  {
    icon: Database,
    category: 'Storage',
    title: 'S3 Storage Classes & Lifecycle Policies',
    description: 'Master S3 Standard, Intelligent-Tiering, Glacier Instant Retrieval, and Deep Archive. Learn how lifecycle rules automate cost optimization at scale.',
    tags: ['S3', 'Storage', 'Cost Optimization'],
    readTime: '10 min',
  },
  {
    icon: Network,
    category: 'Networking',
    title: 'VPC Architecture Fundamentals',
    description: 'Subnets, route tables, internet gateways, NAT gateways, and VPC peering — the complete networking model every Solutions Architect must command.',
    tags: ['VPC', 'Networking', 'Security'],
    readTime: '12 min',
  },
  {
    icon: Shield,
    category: 'Security',
    title: 'IAM Policies, Roles & Permission Boundaries',
    description: 'Decode identity-based vs resource-based policies, SCPs, and permission boundaries. Includes real-world least-privilege design patterns.',
    tags: ['IAM', 'Security', 'Governance'],
    readTime: '9 min',
  },
  {
    icon: Server,
    category: 'High Availability',
    title: 'Auto Scaling & Elastic Load Balancing',
    description: 'Design fault-tolerant architectures using ALB, NLB, and ASG. Covers scaling policies, health checks, and multi-AZ deployment strategies.',
    tags: ['ASG', 'ELB', 'Resilience'],
    readTime: '11 min',
  },
  {
    icon: Lock,
    category: 'Encryption',
    title: 'AWS KMS & Encryption at Rest/Transit',
    description: 'CMKs, data keys, envelope encryption, and how KMS integrates with S3, EBS, RDS, and Secrets Manager for end-to-end data protection.',
    tags: ['KMS', 'Encryption', 'Compliance'],
    readTime: '7 min',
  },
  {
    icon: Layers,
    category: 'Serverless',
    title: 'Lambda, API Gateway & Event-Driven Design',
    description: 'Build serverless architectures with Lambda triggers, API Gateway stages, and SQS/SNS fan-out patterns. Includes cold start mitigation strategies.',
    tags: ['Lambda', 'Serverless', 'API Gateway'],
    readTime: '13 min',
  },
  {
    icon: Database,
    category: 'Databases',
    title: 'RDS Multi-AZ vs Read Replicas vs Aurora',
    description: 'When to choose RDS Multi-AZ for HA, Read Replicas for read scaling, or Aurora for global distributed workloads. Includes failover behavior analysis.',
    tags: ['RDS', 'Aurora', 'Database'],
    readTime: '10 min',
  },
];

const KnowledgeBase = () => {
  return (
    <div className="space-y-12 pb-20">
      <section className="text-center space-y-4 pt-12">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
            <BookOpen className="text-orange-500 w-8 h-8" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Knowledge <span className="text-orange-500">Base</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Deep-dive technical references for every AWS domain covered in the SAA-C03 exam.
        </p>
        <div className="pt-4 flex justify-center gap-4 flex-wrap">
          <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
            SAA-C03 Aligned
          </span>
          <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-500">
            {articles.length} Articles
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {articles.map((article, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-orange-500/30 transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <article.icon className="text-orange-500 w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-800 px-2 py-1 rounded-md">
                {article.readTime} read
              </span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2">{article.category}</p>
            <h3 className="text-lg font-bold mb-3 group-hover:text-orange-400 transition-colors">{article.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">{article.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {article.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-bold text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        ))}
      </div>

      <section className="max-w-4xl mx-auto p-10 bg-slate-900 border border-orange-500/20 rounded-3xl text-center space-y-4">
        <h2 className="text-2xl font-bold">Ready to test your knowledge?</h2>
        <p className="text-slate-400 text-sm">Apply what you've learned across 16 full-length practice exams.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20"
        >
          Browse Exams <ChevronRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
};

export default KnowledgeBase;
