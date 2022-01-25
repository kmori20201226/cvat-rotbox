import requests
import argparse
import json
import sys

class Error(Exception):
    pass

headers = {
    "accept": "application/json",
    "Content-Type": "application/json",
}

def get_task_images(args):
    CVAT_API = "%s/api/v1" % (args.src_url,)

    payload = {
        'username': args.user,
        'email': args.email,
        'password': args.password 
    }
    json_data = json.dumps(payload).encode("utf-8")
    response = requests.post(
        f'{CVAT_API}/auth/login',
        headers=headers,
        data=json_data,
        verify=False
    )
    if response.status_code != 200:
        raise Error("cvat にログインできません Status=%d" % (response.status_code,))
    login_response = response.json()
    try:
        key = login_response['key']
    except:
        raise Error("cvat にログインできません (key が見つからない)")
    headers.update(
        {'Authorization': 'Token ' + key}
    )
    response = requests.get(
        "%s/tasks?name=%s" % (CVAT_API, args.task_no),
        headers = headers,
        verify=False
    )
    if response.status_code != 200:
        raise Error("タスク取得に失敗")
    contents = response.json()
    tasklist = contents['results']
    if len(tasklist) == 0:
        raise Error("該当するタスクが見つからない")
    for t in tasklist:
        print("%3s: %s" % (t['id'], t['name']), file=sys.stderr)
    if len(tasklist) > 1:
        raise Error("該当するタスクが複数ある")
    task_id = tasklist[0]['id']
    response = requests.get(
        "%s/tasks/%s/data/meta" % (CVAT_API, task_id),
        headers = headers,
        verify=False
    )
    if response.status_code != 200:
        raise Error("タスクメタデータ取得に失敗しました (%s)" % (response.status_code,))
    contents = response.json()
    image_names = []
    for frame in contents['frames']:
        fullname = frame['name']
        purename = fullname.split("/")[-1]
        purename = purename.split(".")[0]
        image_names += [purename]
    def dump(file):
        for n in image_names:
            print(n, file=file)
    if args.output:
        with open(args.output, "w") as f:
            dump(f)
    else:
        dump(None)
    print("Total %d images" % (len(image_names),), file=sys.stderr)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("src_url")
    parser.add_argument("task_no")
    parser.add_argument("--output", "-o", help="output-file name")
    parser.add_argument("--user", "-u", help="User name")
    parser.add_argument("--email", "-e", help="User email")
    parser.add_argument("--password", "-p", help="Password")
    args = parser.parse_args()
    if args.email is None: args.email = "mori@yscc.co.jp"
    if args.user is None: args.user = "admin"
    if args.password is None: args.password = "admin"
    try:
        get_task_images(args)
    except Error as err:
        print(err)
        sys.exit(1)


