# Generated by Django 3.1.7 on 2021-03-10 22:01

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_workspaceuser_active"),
    ]

    operations = [
        migrations.AddField(
            model_name="workspaceuser",
            name="went_inactive_at",
            field=models.DateTimeField(
                auto_now_add=True, default=django.utils.timezone.now
            ),
            preserve_default=False,
        ),
    ]
