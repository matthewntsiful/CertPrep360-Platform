import json
import boto3
import argparse
import sys
from botocore.exceptions import ClientError

def load_data(file_path):
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
            return data
    except Exception as e:
        print(f"Error reading JSON file {file_path}: {e}")
        sys.exit(1)

def chunk_data(data, chunk_size):
    for i in range(0, len(data), chunk_size):
        yield data[i:i + chunk_size]

def transform_to_dynamo_item(question):
    # Base structure handling
    cert_id = question.get('cert_id', '').upper()
    exam_id = question.get('exam_id')
    q_id = question.get('q_id')
    
    if not cert_id or not exam_id or not q_id:
        print(f"Warning: Skipping item missing required IDs (cert_id, exam_id, q_id): {question}")
        return None

    # Implement Single-Table Design schema mapping
    # PK: CERT#<certId>
    # SK: EXAM#<examId>#QUESTION#<q_id>
    item = {
        'PK': f"CERT#{cert_id}",
        'SK': f"EXAM#{exam_id}#QUESTION#{q_id}",
    }
    
    # Merge the rest of the question data into the item
    for key, value in question.items():
        # Avoid overwriting partition/sort keys if they magically existed
        if key not in ['PK', 'SK']:
            item[key] = value
            
    return item

def ingest_data(table_name, file_path, region_name):
    print(f"Loading data from {file_path}...")
    json_data = load_data(file_path)
    
    print(f"Transforming {len(json_data)} items according to schema...")
    dynamo_items = []
    for q in json_data:
        item = transform_to_dynamo_item(q)
        if item:
            dynamo_items.append(item)
    
    if not dynamo_items:
        print("No valid items to upload. Exiting.")
        sys.exit(0)

    print(f"Connecting to DynamoDB Table '{table_name}' in region '{region_name}'...")
    try:
        dynamodb = boto3.resource('dynamodb', region_name=region_name)
        table = dynamodb.Table(table_name)
    except Exception as e:
        print(f"Failed to initialize Boto3 DynamoDB resource: {e}")
        sys.exit(1)

    print(f"Starting batch write for {len(dynamo_items)} items...")
    successful_writes = 0
    failed_writes = 0

    # DynamoDB batch_writer automatically handles buffering and chunks of 25.
    try:
        with table.batch_writer() as batch:
            for item in dynamo_items:
                try:
                    batch.put_item(Item=item)
                    successful_writes += 1
                except Exception as e:
                    print(f"Error queueing item {item.get('q_id')}: {e}")
                    failed_writes += 1
                    
        print(f"\nIngestion Complete!")
        print(f"Successfully processed: {successful_writes}")
        print(f"Failed to process: {failed_writes}")

    except ClientError as e:
        print(f"AWS ClientError during batch write: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error during batch write: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CertPrep360 DynamoDB Content Ingestion Utility")
    parser.add_argument("--table", required=True, help="Target DynamoDB Table Name")
    parser.add_argument("--file", required=True, help="Path to the JSON questions file")
    parser.add_argument("--region", default="ca-central-1", help="AWS Region (default: ca-central-1)")
    
    args = parser.parse_args()
    
    ingest_data(args.table, args.file, args.region)
