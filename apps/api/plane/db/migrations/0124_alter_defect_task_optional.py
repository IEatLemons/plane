# Generated manually for optional defect parent task

# Django imports
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0123_defect"),
    ]

    operations = [
        migrations.AlterField(
            model_name="defect",
            name="task",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="defects",
                to="db.issue",
            ),
        ),
    ]
