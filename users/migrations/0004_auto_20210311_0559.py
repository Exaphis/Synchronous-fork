# Generated by Django 3.1.7 on 2021-03-11 05:59

from django.db import migrations, models
import users.models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_workspaceuser_went_inactive_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="workspaceuser",
            name="nickname",
            field=models.CharField(
                default=users.models.get_random_nickname, max_length=150
            ),
        ),
    ]
