// Centralized AWS SAA-C03 Resource Database
// Questions reference topics instead of duplicating resources

const RESOURCES = {
  // COMPUTE
  "ec2-instances": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/ec2/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/ec2/getting-started/"}
    ]
  },
  "ec2-auto-scaling": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/autoscaling/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=4EOaAkY4pNE"}
    ]
  },
  "lambda": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/lambda/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/lambda/getting-started/"}
    ]
  },
  "ecs-fargate": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/ecs/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=AkafJkLw2qc"}
    ]
  },
  "elastic-beanstalk": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/elasticbeanstalk/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/elasticbeanstalk/getting-started/"}
    ]
  },

  // STORAGE
  "s3-basics": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/s3/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/s3/getting-started/"}
    ]
  },
  "s3-encryption": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingEncryption.html"},
      {type: "💡 Best Practices", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html"}
    ]
  },
  "s3-lifecycle": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html"},
      {type: "💰 Cost Optimization", url: "https://aws.amazon.com/s3/cost-optimization/"}
    ]
  },
  "s3-replication": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=9Y_JZ1e-XKw"}
    ]
  },
  "ebs-volumes": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/ebs/"},
      {type: "🎓 Tutorial", url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volumes.html"}
    ]
  },
  "efs": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/efs/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=6ZIPBC78U5k"}
    ]
  },
  "fsx": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/fsx/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/fsx/when-to-choose-fsx/"}
    ]
  },
  "storage-gateway": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/storagegateway/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=9wgaV70FeaM"}
    ]
  },

  // DATABASE
  "rds": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/rds/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/rds/getting-started/"}
    ]
  },
  "aurora": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=FzxqIdIZ9wc"}
    ]
  },
  "dynamodb": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/dynamodb/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/dynamodb/getting-started/"}
    ]
  },
  "elasticache": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/elasticache/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=QxcB53mL_oA"}
    ]
  },
  "redshift": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/redshift/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/redshift/getting-started/"}
    ]
  },

  // NETWORKING
  "vpc": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/vpc/"},
      {type: "🎓 Tutorial", url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-getting-started.html"}
    ]
  },
  "vpc-peering": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/vpc/latest/peering/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=gJBFdN0iBcU"}
    ]
  },
  "transit-gateway": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/vpc/latest/tgw/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=yQGxPEGt_-w"}
    ]
  },
  "route53": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/route53/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/route53/getting-started/"}
    ]
  },
  "cloudfront": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/cloudfront/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=AT-nHW3_SVI"}
    ]
  },
  "elb": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/elasticloadbalancing/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/elasticloadbalancing/getting-started/"}
    ]
  },
  "alb": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=HKh54BkaOK0"}
    ]
  },
  "nlb": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/network/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=NKvbk9vVxzQ"}
    ]
  },
  "api-gateway": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/apigateway/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/api-gateway/getting-started/"}
    ]
  },
  "direct-connect": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/directconnect/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=DXFooR95BYc"}
    ]
  },
  "vpn": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/vpn/"},
      {type: "🎓 Tutorial", url: "https://docs.aws.amazon.com/vpn/latest/s2svpn/SetUpVPNConnections.html"}
    ]
  },

  // SECURITY
  "iam": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/iam/"},
      {type: "💡 Best Practices", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html"}
    ]
  },
  "kms": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/kms/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=8Z0wsE2HoSo"}
    ]
  },
  "secrets-manager": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/secretsmanager/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/secrets-manager/getting-started/"}
    ]
  },
  "waf": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/waf/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=nUI7G9UzyN8"}
    ]
  },
  "shield": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/shield/"},
      {type: "💡 Best Practices", url: "https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/"}
    ]
  },
  "cognito": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/cognito/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/cognito/getting-started/"}
    ]
  },
  "guardduty": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/guardduty/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=czsuZXQvD8E"}
    ]
  },
  "inspector": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/inspector/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/inspector/getting-started/"}
    ]
  },

  // MONITORING & MANAGEMENT
  "cloudwatch": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/cloudwatch/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/cloudwatch/getting-started/"}
    ]
  },
  "cloudtrail": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/cloudtrail/"},
      {type: "💡 Best Practices", url: "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html"}
    ]
  },
  "config": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/config/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=X_fznJtSyV8"}
    ]
  },
  "systems-manager": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/systems-manager/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/systems-manager/getting-started/"}
    ]
  },
  "cloudformation": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/cloudformation/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=Omppm_YUG2g"}
    ]
  },

  // INTEGRATION & MESSAGING
  "sqs": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/sqs/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/sqs/getting-started/"}
    ]
  },
  "sns": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/sns/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=kD77xXxKKCI"}
    ]
  },
  "kinesis": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/kinesis/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/kinesis/getting-started/"}
    ]
  },
  "eventbridge": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/eventbridge/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=TXh5oU_yo9M"}
    ]
  },
  "step-functions": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/step-functions/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/step-functions/getting-started/"}
    ]
  },

  // MIGRATION & TRANSFER
  "dms": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/dms/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=ouia1Sc5QGo"}
    ]
  },
  "snowball": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/snowball/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/snowball/getting-started/"}
    ]
  },
  "datasync": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/datasync/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=PA6lbhGSDvw"}
    ]
  },

  // ANALYTICS
  "athena": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/athena/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/athena/getting-started/"}
    ]
  },
  "glue": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/glue/"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=qgWMfNSN9f4"}
    ]
  },
  "emr": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/emr/"},
      {type: "🎓 Tutorial", url: "https://aws.amazon.com/emr/getting-started/"}
    ]
  },

  // COST OPTIMIZATION
  "cost-explorer": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html"},
      {type: "💰 Cost Optimization", url: "https://aws.amazon.com/aws-cost-management/"}
    ]
  },
  "trusted-advisor": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html"},
      {type: "🎥 Video", url: "https://www.youtube.com/watch?v=kQcVZ7d_Xfs"}
    ]
  },

  // DISASTER RECOVERY
  "backup": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/aws-backup/"},
      {type: "💡 Best Practices", url: "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/plan-for-disaster-recovery-dr.html"}
    ]
  },
  "disaster-recovery": {
    resources: [
      {type: "📖 AWS Docs", url: "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/"},
      {type: "📝 Whitepaper", url: "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-workloads-on-aws.pdf"}
    ]
  }
};
