import boto3
import time
from datetime import datetime, timedelta

def main():
    client = boto3.client('logs', region_name='us-east-1')
    group_name = '/aws/lambda/CertPrep360-Dev-GetQuestions'
    
    start_time = int((datetime.now() - timedelta(hours=2)).timestamp() * 1000)
    
    try:
        response = client.filter_log_events(
            logGroupName=group_name,
            startTime=start_time,
            filterPattern='ERROR'
        )
        events = response.get('events', [])
        print(f"Found {len(events)} Error events.")
        for e in events[-20:]:  # print last 20
            print(e['message'].strip())
            
    except Exception as e:
        print(f"Boto3 error: {e}")

if __name__ == '__main__':
    main()
