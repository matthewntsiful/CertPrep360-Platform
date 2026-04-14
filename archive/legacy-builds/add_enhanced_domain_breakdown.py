#!/usr/bin/env python3

import os
import glob

def add_enhanced_domain_breakdown():
    exam_dir = "SAA-C03_Complete_Exam_Suite/Associate_Exams"
    exam_files = glob.glob(f"{exam_dir}/*.html")
    
    # Enhanced domain analysis method
    enhanced_domain_analysis = '''
    generateDomainInsights(domainStats) {
        let insights = '';
        const weakDomains = [];
        const strongDomains = [];
        
        Object.entries(domainStats).forEach(([domain, stats]) => {
            if (stats.total > 0) {
                const percentage = Math.round((stats.correct / stats.total) * 100);
                if (percentage < 70) {
                    weakDomains.push({domain, percentage, stats});
                } else if (percentage >= 85) {
                    strongDomains.push({domain, percentage, stats});
                }
            }
        });
        
        if (weakDomains.length > 0) {
            insights += `
                <div class="insights-section weak-areas">
                    <h4>🎯 Focus Areas for Improvement</h4>
                    ${weakDomains.map(item => `
                        <div class="insight-item">
                            <strong>${item.domain.replace('Design ', '')}</strong> (${item.percentage}%)
                            <div class="study-tips">
                                ${this.getStudyRecommendations(item.domain)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (strongDomains.length > 0) {
            insights += `
                <div class="insights-section strong-areas">
                    <h4>💪 Your Strengths</h4>
                    ${strongDomains.map(item => `
                        <div class="insight-item">
                            <strong>${item.domain.replace('Design ', '')}</strong> (${item.percentage}%)
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        return insights;
    }
    
    getStudyRecommendations(domain) {
        const recommendations = {
            'Design Secure Architectures': `
                • Review IAM policies, roles, and permissions
                • Study VPC security groups and NACLs
                • Focus on encryption (KMS, CloudHSM)
                • Practice AWS Config and CloudTrail
            `,
            'Design Resilient Architectures': `
                • Master Multi-AZ and cross-region deployments
                • Study Auto Scaling and Load Balancers
                • Review backup and disaster recovery strategies
                • Practice RDS failover scenarios
            `,
            'Design High-Performing Architectures': `
                • Study caching strategies (ElastiCache, CloudFront)
                • Review database performance optimization
                • Focus on compute optimization (EC2, Lambda)
                • Practice monitoring with CloudWatch
            `,
            'Design Cost-Optimized Architectures': `
                • Master Reserved Instances and Spot pricing
                • Study S3 storage classes and lifecycle policies
                • Review cost monitoring tools (Cost Explorer, Budgets)
                • Practice right-sizing recommendations
            `,
            'General': `
                • Review core AWS services and use cases
                • Study well-architected framework principles
                • Practice service integration patterns
                • Focus on troubleshooting scenarios
            `
        };
        
        return recommendations[domain] || '• Review AWS documentation and practice labs';
    }'''
    
    # Enhanced CSS for domain insights
    enhanced_css = '''
        .insights-section {
            margin: 25px 0;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid;
        }
        
        .weak-areas {
            background: #fff5f5;
            border-left-color: #dc3545;
        }
        
        .strong-areas {
            background: #f0fff4;
            border-left-color: #28a745;
        }
        
        .insights-section h4 {
            margin: 0 0 15px 0;
            color: #2c3e50;
        }
        
        .insight-item {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .insight-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .study-tips {
            margin-top: 8px;
            font-size: 0.9em;
            color: #6c757d;
            white-space: pre-line;
            line-height: 1.4;
        }
        
        .domain-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }
        
        .detail-item {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 6px;
            text-align: center;
        }
        
        .detail-value {
            font-size: 1.2em;
            font-weight: bold;
            color: #1976d2;
        }
        
        .detail-label {
            font-size: 0.8em;
            color: #6c757d;
            margin-top: 2px;
        }
        
        .performance-indicator {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: bold;
            margin-left: 10px;
        }
        
        .performance-indicator.excellent {
            background: #d4edda;
            color: #155724;
        }
        
        .performance-indicator.good {
            background: #cce7ff;
            color: #004085;
        }
        
        .performance-indicator.needs-work {
            background: #f8d7da;
            color: #721c24;
        }'''
    
    # Enhanced domain card template
    enhanced_domain_card = '''domainHTML += `
                    <div class="domain-card">
                        <div>
                            <div class="domain-name">
                                ${domain.replace('Design ', '')}
                                <span class="performance-indicator ${
                                    domainPercentage >= 85 ? 'excellent' : 
                                    domainPercentage >= 70 ? 'good' : 'needs-work'
                                }">
                                    ${domainPercentage >= 85 ? 'Excellent' : 
                                      domainPercentage >= 70 ? 'Good' : 'Needs Work'}
                                </span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${domainPercentage >= 70 ? 'pass' : 'fail'}" 
                                     style="width: ${domainPercentage}%"></div>
                            </div>
                            <div class="domain-details">
                                <div class="detail-item">
                                    <div class="detail-value">${stats.correct}</div>
                                    <div class="detail-label">Correct</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-value">${stats.total - stats.correct}</div>
                                    <div class="detail-label">Missed</div>
                                </div>
                            </div>
                        </div>
                        <div class="domain-score ${domainPercentage >= 70 ? 'pass' : 'fail'}">
                            ${domainPercentage}%
                        </div>
                    </div>
                `;'''
    
    for exam_file in exam_files:
        try:
            with open(exam_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add enhanced domain analysis if not exists
            if 'generateDomainInsights(' not in content:
                content = content.replace(
                    'clearAnswer(questionIndex) {',
                    enhanced_domain_analysis + '\n    \n    clearAnswer(questionIndex) {'
                )
                
                # Add enhanced CSS
                content = content.replace(
                    '        .performance-indicator.needs-work {',
                    enhanced_css + '\n        \n        .performance-indicator.needs-work {'
                )
                
                # Replace domain card template
                old_domain_card = '''domainHTML += `
                    <div class="domain-card">
                        <div>
                            <div class="domain-name">${domain.replace('Design ', '')}</div>
                            <div class="progress-bar">
                                <div class="progress-fill ${domainPercentage >= 70 ? 'pass' : 'fail'}" 
                                     style="width: ${domainPercentage}%"></div>
                            </div>
                        </div>
                        <div class="domain-score ${domainPercentage >= 70 ? 'pass' : 'fail'}">
                            ${stats.correct}/${stats.total} (${domainPercentage}%)
                        </div>
                    </div>
                `;'''
                
                content = content.replace(old_domain_card, enhanced_domain_card)
                
                # Add insights to results display
                content = content.replace(
                    '<div class="action-buttons">',
                    '${this.generateDomainInsights(domainStats)}\n                        \n                        <div class="action-buttons">'
                )
                
                with open(exam_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✓ Enhanced domain breakdown in {os.path.basename(exam_file)}")
            else:
                print(f"- Enhanced domain breakdown already exists in {os.path.basename(exam_file)}")
                
        except Exception as e:
            print(f"✗ Error processing {exam_file}: {e}")
    
    print(f"\nProcessed {len(exam_files)} exam files")

if __name__ == "__main__":
    add_enhanced_domain_breakdown()
