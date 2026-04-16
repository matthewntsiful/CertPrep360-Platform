import boto3
import re
from botocore.exceptions import ClientError
import sys

def migrate_database(table_name):
    print(f"Starting naming convention migration for table: {table_name}")
    session = boto3.Session(profile_name='Matthew_Cli', region_name='us-east-1')
    dynamodb = session.resource('dynamodb')
    table = dynamodb.Table(table_name)
    
    # We will scan the entire table, looking for any items where the SK matches "_Minimal_Exam_"
    scan_kwargs = {}
    done = False
    start_key = None
    items_to_migrate = []
    
    print("Scanning for legacy exam names...")
    while not done:
        if start_key:
            scan_kwargs['ExclusiveStartKey'] = start_key
        try:
            response = table.scan(**scan_kwargs)
        except Exception as e:
            print(f"Failed to scan: {e}")
            break
            
        items = response.get('Items', [])
        for item in items:
            sk = item.get('SK', '')
            if "_Minimal_Exam_" in sk:
                items_to_migrate.append(item)
                
        start_key = response.get('LastEvaluatedKey', None)
        done = start_key is None
        
    print(f"Found {len(items_to_migrate)} items requiring standardization.")
    
    if len(items_to_migrate) == 0:
        return
        
    # Execute batch write (duplicates the item with new SK, deletes old item)
    with table.batch_writer() as batch:
        for idx, item in enumerate(items_to_migrate):
            old_sk = item['SK']
            
            # e.g EXAM#SAA-C03_Minimal_Exam_01#QUESTION#123 -> EXAM#SAA-C03-EXAM-01#QUESTION#123
            new_sk = re.sub(r'([A-Z0-9\-]+)_Minimal_Exam_(\d+)', r'\1-EXAM-\2', old_sk)
            
            if old_sk != new_sk:
                # Update embedded metadata fields if they exist
                if 'exam_id' in item and '_Minimal_Exam_' in item['exam_id']:
                    item['exam_id'] = re.sub(r'([A-Z0-9\-]+)_Minimal_Exam_(\d+)', r'\1-EXAM-\2', item['exam_id'])
                
                if 'q_id' in item and '_Minimal_Exam_' in item['q_id']:
                    item['q_id'] = re.sub(r'([A-Z0-9\-]+)_Minimal_Exam_(\d+)', r'\1-EXAM-\2', item['q_id'])

                if 'GSI1-SK' in item and '_Minimal_Exam_' in item['GSI1-SK']:
                    item['GSI1-SK'] = re.sub(r'([A-Z0-9\-]+)_Minimal_Exam_(\d+)', r'\1-EXAM-\2', item['GSI1-SK'])
                
                # Delete the old item
                batch.delete_item(
                    Key={
                        'PK': item['PK'],
                        'SK': old_sk
                    }
                )
                
                # Assign the new string and upload the new identical item
                item['SK'] = new_sk
                batch.put_item(Item=item)
                
            if idx % 100 == 0:
                print(f"Migrated {idx}/{len(items_to_migrate)} items...")
                
    print("Migration complete!")

if __name__ == '__main__':
    migrate_database("CertPrep360-Dev-Main")
