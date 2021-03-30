# Generated by Django 3.1.7 on 2021-03-30 06:33

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('workspaces', '0009_auto_20210320_1931'),
    ]

    operations = [
        migrations.CreateModel(
            name='TusdFileShare',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('workspace', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='workspaces.workspace')),
            ],
        ),
        migrations.CreateModel(
            name='TusdFile',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('file_id', models.CharField(max_length=255)),
                ('name', models.CharField(max_length=255)),
                ('file_share', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tusdfileshare.tusdfileshare')),
            ],
        ),
    ]
