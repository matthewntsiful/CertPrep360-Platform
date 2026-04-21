import boto3
from collections import Counter

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('CertPrep360-Dev-Main')

response = table.scan(
    FilterExpression="begins_with(cert_id, :prefix) OR begins_with(PK, :pkPrefix)",
    ExpressionAttributeValues={
        ":prefix": "CLF",
        ":pkPrefix": "EXAM#CLF"
    }
)
items = response.get('Items', [])
while 'LastEvaluatedKey' in response:
    response = table.scan(
        FilterExpression="begins_with(cert_id, :prefix) OR begins_with(PK, :pkPrefix)",
        ExpressionAttributeValues={
            ":prefix": "CLF",
            ":pkPrefix": "EXAM#CLF"
        },
        ExclusiveStartKey=response['LastEvaluatedKey']
    )
    items.extend(response.get('Items', []))

exam_counts = Counter(item.get('exam_id') for item in items if item.get('type') == 'QUESTION')
print("CLF Exam IDs and their question counts:")
for exam_id, count in exam_counts.items():
    print(f" - {exam_id}: {count} questions")

response_clf = table.scan(
    FilterExpression="cert_id = :clf",
    ExpressionAttributeValues={":clf": "CLF-C02"}
)
items_clf = response_clf.get('Items', [])
clf_exam_counts = Counter(item.get('exam_id') for item in items_clf if item.get('type') == 'QUESTION')
print("\nExam IDs specifically mapped to cert_id = CLF-C02:")
for exam_id, count in clf_exam_counts.items():
    print(f" - {exam_id}: {count} questions")
