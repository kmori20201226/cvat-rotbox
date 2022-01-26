"""This script is to get task image list from CVAT.
The output of this program is used by conv-cvat-rotbox.py

Usage :-
   python get-task-imagenames.py [options...] cvat-url task-name

   options:
      --output  <filename>    Specifies output file name.
      --user  <user>          cvat login user
      --emal  <email>         cvat login email
      --password <password>   cvat login password
"""
import requests
import argparse
import json
import sys

class Error(Exception):
    """Exception class for known errors"""
    pass

headers = {
    "accept": "application/json",
    "Content-Type": "application/json",
}

def get_task_images(args):
    """Get task images from cvat server

    Args:
       args :     Command line arguments
    """
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
        raise Error("Login failed Status=%d" % (response.status_code,))
    login_response = response.json()
    try:
        key = login_response['key']
    except:
        raise Error("Login failed (internal: key not found in response)")
    headers.update(
        {'Authorization': 'Token ' + key}
    )
    response = requests.get(
        "%s/tasks?name=%s" % (CVAT_API, args.task_no),
        headers = headers,
        verify=False
    )
    if response.status_code != 200:
        raise Error("Task retrieval failed")
    contents = response.json()
    tasklist = contents['results']
    if len(tasklist) == 0:
        raise Error("No task found")
    for t in tasklist:
        print("%3s: %s" % (t['id'], t['name']), file=sys.stderr)
    if len(tasklist) > 1:
        raise Error("Found multiple tasks")
    task_id = tasklist[0]['id']
    response = requests.get(
        "%s/tasks/%s/data/meta" % (CVAT_API, task_id),
        headers = headers,
        verify=False
    )
    if response.status_code != 200:
        raise Error("Task metadata retrival failed (%s)" % (response.status_code,))
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
    if args.email is None: args.email = "nanashinogonbe@xxx.com"
    if args.user is None: args.user = "admin"
    if args.password is None: args.password = "admin"
    try:
        get_task_images(args)
    except Error as err:
        print(err)
        sys.exit(1)
