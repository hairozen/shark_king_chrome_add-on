#! /usr/bin/python2
import os, os.path
import json
import csv
from bottle import default_app, route, request, static_file, run
from lockfile import FileLock

@route('/upload', method='POST')
def do_upload():
    save_path = os.path.join(request.query['id'], 'uploads')
    if not os.path.exists(save_path):
        os.makedirs(save_path)
    correct = request.files.get('correct')
    others_count = 3
    others = []
    for i in range(others_count):
        others.append(request.files.get('other' + str(i+1)))
    files = [correct] + others
    names = ['correct.jpg', '1.jpg', '2.jpg', '3.jpg']
    for f, name in zip(files, names):
        ext = os.path.splitext(f.filename)[1]
        if ext not in ('.jpg'):
            return "File extension not allowed."
        file_path = "{path}/{file}".format(path=save_path, file=name)
        f.save(file_path, overwrite=True)
    return "File successfully saved to '{0}'.".format(save_path)

@route('/static/:filename')
def serve_image(filename):
    user_id = request.query['id']
    return static_file(filename, root=os.path.join(user_id, 'uploads'))

@route('/pre_init', method='POST')
def do_init():
    user_id = request.query['id']
    if not os.path.exists(user_id):
        os.makedirs(user_id)
    current_data = request.json
    filename = os.path.join(user_id, 'current.json')
    with open(filename, 'w') as f:
        json.dump(current_data, f, indent=True)

@route('/:filename')
def serve_file(filename):
    if "init_group" not in filename:
        user_id = request.query['id']
        return static_file(filename, root=user_id)

@route('/groups/:filename')
def serve_group_file(filename):
    return static_file(filename, root='groups')

@route('/ads/:filename')
def serve_ads_file(filename):
    return static_file(filename, root='ads')

@route('/tips/:filename')
def serve_tips_file(filename):
    return static_file(filename, root='tips')

@route('/images/:filename')
def serve_images_file(filename):
    return static_file(filename, root='images')

@route('/frames_all/:filename')
def serve_frames_file(filename):
    return static_file(filename, root='frames_all')

@route('/fakes/:filename')
def serve_fakes_file(filename):
    return static_file(filename, root='fakes')

@route('/log', method='POST')
def log():
    user_id = request.query['id']
    if not os.path.exists(user_id):
        os.makedirs(user_id)
    action = request.json
    log_filename = os.path.join(user_id, 'action.log')
    with open(log_filename, 'a') as f:
        writer = csv.writer(f)
        writer.writerow([action['time'], action['name'], action['hostname'], action['data']])

@route('/email_log', method='POST')
def email_log():
    user_id = request.query['id']
    action = request.json
    with FileLock('/home/chordor/mysite/email_log.txt'):
        f = open('/home/chordor/mysite/email_log.txt', 'a')
        writer = csv.writer(f)
        writer.writerow([user_id, action['time'], action['email']])
        f.close()

@route('/init_group')
def serve_init_group():
    groups = [1, 3, 5, 7, 2, 4, 6, 2, 4, 6, 1, 3, 5, 1, 3, 5, 7, 2, 4, 6, 1, 3, 5, 2, 4, 6]
    with FileLock('/home/chordor/mysite/group_state.txt'):
        f = open('/home/chordor/mysite/group_state.txt', 'r+')
        state_index1 = int(f.readline())
        f.seek(0)
        f.write(str((state_index1 + 1) % len(groups)))
        f.truncate()
        f.close()
    group_id = groups[state_index1]
    if group_id < 3:
        file_name = '/home/chordor/mysite/buttons.txt'
        file_name2 = '/home/chordor/mysite/buttons_fish.txt'
    elif group_id < 5:
        file_name = '/home/chordor/mysite/images.txt'
        file_name2 = '/home/chordor/mysite/images_fish.txt'
    elif group_id < 7:
        file_name = '/home/chordor/mysite/feedback.txt'
        file_name2 = '/home/chordor/mysite/feedback_fish.txt'
    else:
        file_name = '/home/chordor/mysite/control.txt'
        file_name2 = None
    with FileLock(file_name):
        f = open(file_name, 'r+')
        state_index2 = int(f.readline())
        f.seek(0)
        f.write(str((state_index2 + 1) % 2))
        f.truncate()
        f.close()
    if file_name2 is None:
        state_index3 = 0
    else:
        with FileLock(file_name2):
            f = open(file_name2, 'r+')
            state_index3 = int(f.readline())
            f.seek(0)
            f.write(str((state_index3 + 1) % 4))
            f.truncate()
            f.close()
    return json.dumps({'group_id': group_id, 'phishing_id': state_index2, 'fishes': state_index3})

application = default_app()

if __name__ == '__main__':
    run(host='localhost', port=8080)