# Generated by Django 3.1.7 on 2021-04-01 20:55

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("tusdfileshare", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="tusdfile",
            options={"ordering": ["created_at"]},
        ),
    ]
