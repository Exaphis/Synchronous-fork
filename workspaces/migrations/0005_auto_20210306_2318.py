# Generated by Django 3.1.7 on 2021-03-06 23:18

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("workspaces", "0004_auto_20210306_2202"),
    ]

    operations = [
        migrations.RenameField(
            model_name="workspace",
            old_name="viewable_without_password",
            new_name="anonymous_readable",
        ),
    ]
