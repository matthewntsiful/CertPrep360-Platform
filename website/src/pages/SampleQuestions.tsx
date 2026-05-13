import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, CheckCircle2, XCircle, ChevronRight, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const questions = [
  {
    domain: 'Design Resilient Architectures',
    question: 'A company needs a storage solution for a web application that serves static assets globally with the lowest possible latency. Which combination of AWS services should a Solutions Architect recommend?',
    options: [
      'Amazon EC2 with instance store volumes behind an Application Load Balancer',
      'Amazon S3 with Amazon CloudFront as the CDN layer',
      'Amazon EFS mounted across multiple EC2 instances in different regions',
      'Amazon RDS with read replicas deployed in each geographic region',
    ],
    correct: 1,
    explanation: 'S3 provides durable, scalable object storage for static assets. CloudFront caches content at 400+ edge locations globally, delivering sub-millisecond latency to end users — the canonical pattern for static asset delivery on AWS.',
  },
  {
    domain: 'Design High-Performing Architectures',
    question: 'An application experiences unpredictable traffic spikes. The backend must scale automatically and the team wants to minimize operational overhead. Which architecture is most appropriate?',
    options: [
      'EC2 instances in an Auto Scaling Group behind an Application Load Balancer',
      'A single large EC2 instance with enhanced networking enabled',
      'AWS Lambda with API Gateway and DynamoDB',
      'ECS on EC2 with manual capacity planning',
    ],
    correct: 2,
    explanation: 'Lambda + API Gateway + DynamoDB is a fully serverless, event-driven architecture that scales automatically from zero to millions of requests with zero operational overhead — ideal for unpredictable workloads.',
  },
  {
    domain: 'Design Secure Architectures',
    question: 'A Solutions Architect needs to ensure that an S3 bucket is only accessible from a specific VPC. Which approach enforces this at the network level?',
    options: [
      'Attach a bucket policy that denies all public access',
      'Enable S3 Block Public Access on the account level',
      'Use a VPC Endpoint for S3 with a bucket policy restricting access to the VPC endpoint',
      'Configure an IAM role with a condition key for the VPC CIDR range',
    ],
    correct: 2,
    explanation: 'A VPC Gateway Endpoint for S3 combined with a bucket policy using the `aws:sourceVpce` condition key ensures traffic never leaves the AWS network and restricts access exclusively to that VPC endpoint.',
  },
  {
    domain: 'Design Cost-Optimized Architectures',
    question: 'A company runs batch processing jobs that can tolerate interruptions and must minimize compute costs. Which EC2 purchasing option is most cost-effective?',
    options: [
      'On-Demand Instances',
      'Reserved Instances (1-year, No Upfront)',
      'Dedicated Hosts',
      'Spot Instances',
    ],
    correct: 3,
    explanation: 'Spot Instances offer up to 90% discount over On-Demand pricing. Since batch jobs are fault-tolerant and can be interrupted and restarted, Spot is the optimal choice for maximum cost savings.',
  },
  {
    domain: 'Design Resilient Architectures',
    question: 'A relational database must remain available during an Availability Zone failure with automatic failover and no data loss. Which RDS configuration achieves this?',
    options: [
      'RDS with a Read Replica in the same AZ',
      'RDS Multi-AZ deployment with synchronous replication',
      'RDS with automated backups enabled and a 7-day retention period',
      'RDS with a Read Replica in a different region',
    ],
    correct: 1,
    explanation: 'RDS Multi-AZ uses synchronous replication to a standby instance in a different AZ. On failure, AWS automatically promotes the standby with no data loss and minimal downtime — typically under 60 seconds.',
  },
];

const SampleQuestions = () => {
  const [selected, setSelected] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [revealed, setRevealed] = useState<boolean[]>(Array(questions.length).fill(false));

  const handleSelect = (qIdx: number, oIdx: number) => {
    if (revealed[qIdx]) return;
    setSelected(prev => prev.map((v, i) => (i === qIdx ? oIdx : v)));
  };

  const handleReveal = (qIdx: number) => {
    if (selected[qIdx] === null) return;
    setRevealed(prev => prev.map((v, i) => (i === qIdx ? true : v)));
  };

  const handleReset = () => {
    setSelected(Array(questions.length).fill(null));
    setRevealed(Array(questions.length).fill(false));
  };

  const score = revealed.filter((r, i) => r && selected[i] === questions[i].correct).length;
  const totalRevealed = revealed.filter(Boolean).length;

  return (
    <div className="space-y-12 pb-20">
      <section className="text-center space-y-4 pt-12">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <FlaskConical className="text-blue-500 w-8 h-8" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Sample <span className="text-blue-500">Questions</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          5 representative SAA-C03 questions across all exam domains. Select an answer, then reveal the explanation.
        </p>
        {totalRevealed > 0 && (
          <div className="pt-2 flex justify-center gap-4">
            <span className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-full text-sm font-bold text-white">
              Score: <span className="text-blue-400">{score}/{totalRevealed}</span> answered
            </span>
          </div>
        )}
      </section>

      <div className="max-w-4xl mx-auto space-y-8">
        {questions.map((q, qIdx) => {
          const isRevealed = revealed[qIdx];
          const userAnswer = selected[qIdx];

          return (
            <motion.div
              key={qIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qIdx * 0.08 }}
              className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">
                  {q.domain}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Q{qIdx + 1} of {questions.length}
                </span>
              </div>

              <p className="text-white font-medium leading-relaxed">{q.question}</p>

              <div className="space-y-3">
                {q.options.map((option, oIdx) => {
                  let style = 'border-slate-800 bg-slate-900/30 hover:border-slate-600 cursor-pointer';
                  if (isRevealed) {
                    if (oIdx === q.correct) style = 'border-emerald-500/50 bg-emerald-500/10 cursor-default';
                    else if (oIdx === userAnswer) style = 'border-red-500/50 bg-red-500/10 cursor-default';
                    else style = 'border-slate-800 bg-slate-900/20 opacity-50 cursor-default';
                  } else if (userAnswer === oIdx) {
                    style = 'border-blue-500/50 bg-blue-500/10 cursor-pointer';
                  }

                  return (
                    <div
                      key={oIdx}
                      onClick={() => handleSelect(qIdx, oIdx)}
                      className={`flex items-center gap-4 p-4 border rounded-2xl transition-all ${style}`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="text-sm text-slate-300">{option}</span>
                      {isRevealed && oIdx === q.correct && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />}
                      {isRevealed && oIdx === userAnswer && oIdx !== q.correct && <XCircle className="w-5 h-5 text-red-500 ml-auto shrink-0" />}
                    </div>
                  );
                })}
              </div>

              <AnimatePresence>
                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 bg-slate-800/50 border border-slate-700 rounded-2xl"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2">Explanation</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{q.explanation}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isRevealed && (
                <button
                  onClick={() => handleReveal(qIdx)}
                  disabled={userAnswer === null}
                  className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-sm font-bold transition-all disabled:cursor-not-allowed"
                >
                  Reveal Answer
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 hover:border-slate-600 text-white rounded-xl text-sm font-bold transition-all"
        >
          <RotateCcw className="w-4 h-4" /> Reset Questions
        </button>
        <Link
          to="/"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20"
        >
          Take a Full Exam <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default SampleQuestions;
