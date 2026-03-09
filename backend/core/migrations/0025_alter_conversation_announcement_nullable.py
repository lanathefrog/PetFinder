from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0024_profile_alert_latitude_profile_alert_longitude_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='conversation',
            name='announcement',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.CASCADE, related_name='conversations', to='core.announcement'),
        ),
    ]
