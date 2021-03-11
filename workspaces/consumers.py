from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.generic.websocket import JsonWebsocketConsumer

from .models import Workspace
from users.models import WorkspaceUser
from users.serializers import WorkspaceUserSerializer


# TODO: ensure that non-authed users cannot connect to the websocket
class UserListConsumer(JsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        self.workspace_group_name = None
        self.workspace = None
        self.user = None
        super().__init__(*args, **kwargs)

    def connect(self):
        unique_id = self.scope['url_route']['kwargs']['unique_id']
        self.workspace_group_name = f'user-list_{unique_id}'

        try:
            self.workspace = Workspace.objects.get(unique_id=unique_id)
        except Workspace.DoesNotExist:
            self.close('Workspace does not exist')
            return

        # add user to groups so they receive all messages
        async_to_sync(self.channel_layer.group_add)(
            self.workspace_group_name,
            self.channel_name
        )

        # num_users = WorkspaceUser.objects.filter(workspace=self.workspace).count()
        # new_user_num = num_users + 1
        self.user = WorkspaceUser.objects.create(nickname='User #',
                                                 workspace=self.workspace)
        self.user.save()
        self.user.nickname += str(self.user.id)
        self.user.save()

        self.accept()
        self.send_user_list()

    def send_user_list(self):
        users = []
        for user in WorkspaceUser.objects.filter(workspace=self.workspace):
            users.append(WorkspaceUserSerializer(user).data)

        async_to_sync(self.channel_layer.group_send)(
            self.workspace_group_name,
            {
                'type': 'user_list_changed',
                'user_list': users
            }
        )

    def disconnect(self, close_code):
        async_to_sync(self.channel_layer.group_discard)(
            self.workspace_group_name,
            self.channel_name
        )

        # handles invalid workspace id leading to no user being created
        if self.user is not None:
            self.user.delete()
            self.send_user_list()

    def user_list_changed(self, event):
        user_list = event['user_list']
        self.send_json(user_list)

    # TODO: show inactive timestamp
    def receive_json(self, content, **kwargs):
        if content['type'] == 'activity':
            new_active = content['isActive']
            if new_active != self.user.active:
                self.user.active = new_active

                if not self.user.active:
                    self.user.went_inactive_at = timezone.now()

                self.user.save()

                self.send_user_list()