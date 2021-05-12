import os, sys, time

# this rmOldSessionFiles.py script can be run manually or as a scheduled PA task

rmOldSessionFileAge = 43200 # this value must be greater than app.config['PERMANENT_SESSION_LIFETIME']

def rmOldSessionFiles():
  try:
    now = time.time()
    path = os.getcwd() + '/flask_session/'
    path = path.replace('mysite', '')  # pn PA the flask_session dir is not
    print('rmOldSessionFiles() path = ' + path)
    for f in os.listdir(path):
      filePath = os.path.join(path, f)
      if os.path.isfile(filePath):
        if os.stat(filePath).st_mtime < now - rmOldSessionFileAge:
          print('rmOldSessionFiles() - removing file: ' + filePath)
          os.remove(filePath)

  except (OSError, IOError) as e:
    print('Error: rmOldSessionFiles(): - Shutil.Error | OSError | IOError: during copy phase: ' + str(e))
  except:
    tupleExc = sys.exc_info()
    print('Error: rmOldSessionFiles(): - Unexpected Exception: ' + str(tupleExc[0]) + '  ' + str(tupleExc[1]))

rmOldSessionFiles()