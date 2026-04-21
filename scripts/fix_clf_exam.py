import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('CertPrep360-Dev-Main')

# Find the items that were mistakenly placed in SAA-C03-EXAM-04
response = table.query(
    KeyConditionExpression="PK = :pk AND begins_with(SK, :skPrefix)",
    FilterExpression="cert_id = :clf",
    ExpressionAttributeValues={
        ":pk": "EXAM#SAA-C03-EXAM-04",
        ":skPrefix": "QUESTION#",
        ":clf": "CLF-C02"
    }
)

items = response.get('Items', [])
print(f"Found {len(items)} Cloud Practitioner questions mistakenly under SAA-C03-EXAM-04.")

if not items:
    print("Nothing to fix.")
    exit(0)

new_exam_id = "CLF-C02-EXAM-02"

with table.batch_writer() as batch:
    for item in items:
        old_pk = item['PK']
        old_sk = item['SK']
        old_q_id = item['q_id']
        
        # We need to extract the _QXXX part 
        # e.g. SAA-C03-EXAM-04_Q066 -> _Q066 (or completely replace it)
        new_q_id = old_q_id.replace("SAA-C03-EXAM-04", new_exam_id)
        
        # New attributes
        new_item = item.copy()
        new_item['PK'] = f"EXAM#{new_exam_id}"
        new_item['SK'] = f"QUESTION#{new_q_id}"
        new_item['exam_id'] = new_exam_id
        new_item['q_id'] = new_q_id
        
        # In case the GSI keys reference the old ID (though they shouldn't usually)
        # GSI1-PK is DOMAIN, GSI1-SK is CERT#CLF-C02
        # So those stay the same
        
        # Put new item
        batch.put_item(Item=new_item)
        
        # Delete old item
        batch.delete_item(Key={'PK': old_pk, 'SK': old_sk})
        print(f"Migrated {old_q_id} -> {new_q_id}")

print("Migration complete!")
