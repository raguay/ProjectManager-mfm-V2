
var ProjectManager = {
  extMan: null,
  html: '',
  cdir: '',
  pjFile: '',
  log: true,
  noteDir: '',
  noteExt: '.md',
  ExtName: 'ProjectManager-mfm-V2',
  prefName: 'projectmanager.json',
  hdir: null,
  fs: null,
  init: async function(extManager) {
    ProjectManager.extMan = extManager;
    ProjectManager.fs = ProjectManager.extMan.getLocalFS();
    ProjectManager.hdir = await ProjectManager.fs.getHomeDir();


    //
    // Load the Preferences for the extension.
    //
    ProjectManager.loadPrefs();

    //
    // Add to the Extra Panel processing.
    //
    ProjectManager.extMan.getExtCommand('addExtraPanelProcessor').command(ProjectManager);
    ProjectManager.extMan.getExtCommand('addDirectoryListener').command(ProjectManager.DirListener);

    //
    // Load Commands
    //
    var cmds = ProjectManager.extMan.getCommands();

    //
    // Setup the logging commands.
    //
    cmds.addCommand('PM: Turn Logging On', 'ProjectManager.logOn', 'Turn logging on for scripts in the Project Manager.', ProjectManager.logOn);
    cmds.addCommand('PM: Turn Logging Off', 'ProjectManager.logOff', 'Turn logging off for scripts in the Project Manager.', ProjectManager.logOff);

    //
    // Add commands for the notes.
    //
    cmds.addCommand('PM: Create a Note', 'ProjectManager.createProjNote', 'Create a note in the project\'s note directory.', ProjectManager.createProjNote);
    cmds.addCommand('PM: Open a Note', 'ProjectManager.openNote', 'Open a note in the project\'s note directory.', ProjectManager.openNote);
    cmds.addCommand('PM: Open a File Note', 'ProjectManager.openFileNote', 'Open the note for the current file in the project.', ProjectManager.openFileNote);
    cmds.addCommand('PM: Set note extension', 'ProjectManager.setNoteExt', 'Set the extension for note files.', ProjectManager.setNoteExt);

    //
    // Add commands for creating and going to projects.
    //
    cmds.addCommand('PM: Go to Project', 'ProjectManager.goto', 'Go to a project.', ProjectManager.goto);
    cmds.addCommand('PM: Make a Project', 'ProjectManager.make', 'Use the current directory as a project.', ProjectManager.create);
    cmds.addCommand('PM: Remove a Project', 'ProjectManager.remove', 'Delete a project from the project list.', ProjectManager.remove);

    //
    // Add Template Commands.
    //
    cmds.addCommand('PM: Install Template', 'ProjectManager.installTemplate', 'Install a template to the current cursor directory.', ProjectManager.installTemplate);
    cmds.addCommand('PM: Make a Local Template', 'ProjectManager.makeLocalTemplate', 'Creates a new template from the directory of the current cursor.', ProjectManager.makeLocalTemplate);
    cmds.addCommand('PM: Make a Web Template', 'ProjectManager.makeWebTemplate', 'Creates a new template from the given GitHub template name.', ProjectManager.makeWebTemplate);
    cmds.addCommand('PM: Remove a Template', 'ProjectManager.removeTemplate', 'Removes the selected template.', ProjectManager.removeTemplate);
    cmds.addCommand('PM: Go to Template', 'ProjectManager.gotoTemplate', 'Opens a Template Folder', ProjectManager.gotoTemplate);
  },
  installKeyMaps: function() {
  },
  check: async function(dir, name, cfs, side) {
    if ((typeof dir !== 'undefined')) {
      dir = dir.toString();
      if ((ProjectManager.pjFile !== '') && (ProjectManager.cdir !== '') && (dir.includes(ProjectManager.cdir))) {
        return (true);
      } else {
        ProjectManager.pjFile = '';
        ProjectManager.html = '';
        var fs = ProjectManager.fs;
        if (fs !== null) {
          try {
            ProjectManager.pjFile = await fs.appendPath(dir, '.startproject');
            if (await fs.fileExists(ProjectManager.pjFile)) {
              ProjectManager.cdir = dir;
              ProjectManager.noteDir = await fs.appendPath(dir, '.notes');
              if (!await fs.fileExists(ProjectManager.noteDir)) {
                await fs.makedir(ProjectManager.noteDir);
              }
              return (true);
            }
          } catch (e) {
            ProjectManager.logToUser("An error checking for a project.");
          }
        }
        ProjectManager.pjFile = '';
        ProjectManager.html = '';
        ProjectManager.cdir = '';
        ProjectManager.noteDir = '';
      }
    }
    return (false);
  },
  createHTML: async function() {
    if (ProjectManager.html === '') {
      //
      // Generate the script block.
      //
      globalThis.ProjectManager = ProjectManager;

      // 
      // Get the local file system.
      // 
      var lfs = ProjectManager.fs;

      //
      // Get the current theme colors.
      // 
      var theme = ProjectManager.extMan.getExtCommand('getTheme').command();

      // 
      // Create the HTML for this project.
      // 
      var html = `
<div id="ProjectManager" style="display: flex; flex-direction: column;">
  <h2>Project Manager</h2>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.runScript()">Run Script</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.editScript()">Edit Script</button>
      `;
      const mfile = await lfs.appendPath(ProjectManager.cdir, 'maskfile.md');
      if (await lfs.fileExists(mfile)) {
        //
        // There is a mask file. Offer to edit it or run a script in it.
        // 
        html += `
<button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.editMaskFile()">Edit MaskFile</button>
        `;
        var mfileContent = await lfs.readFile(mfile);
        var headerReg = /## (.*)/g;
        var match = [...mfileContent.matchAll(headerReg)];
        for (let i = 0; i < match.length; i++) {
          html += `
<button style="border-radius: 10px;  background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.runMaskFile('${match[i][1]}')">
  Run ${match[i][1]} MaskFile Script
</button>
          `;
        }
      }
      const nfile = await lfs.appendPath(ProjectManager.cdir, 'package.json');
      if (await lfs.fileExists(nfile)) {
        //
        // There is a npm file. Offer to edit it or run a script in it.
        // 
        html += `
<button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.editNpmFile()">Edit Npm File</button>
        `;
        var nfileContent = await lfs.readFile(nfile);
        nfileContent = JSON.parse(nfiileContent);
        var keys = Object.keys(nfileContent.scripts);
        for (let i = 0; i < keys.length; i++) {
          html += `
<button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.runNpmFile('${keys[i]}')">
  Run ${keys[i]} Npm Script
</button>
          `;
        }
      }
      html += `
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.openNote()">Open a Project Note</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.createProjNote()">Create a Project Note</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.openFileNote()">Open a File Note</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.remove()">Remove a Project</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.create()">Create a Project</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.makeLocalTemplate()">Create a Local Template</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.makeWebTemplate()">Create a Web Template</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.installTemplate()">Install a Template</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.gotoTemplate()">Go to a Template</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.removeTemplate()">Remove a Template</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.logOn()">Show Script Output</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.logOff()">Hide Script Output</button>
      `;
      html += `</div>`;
      ProjectManager.html = html;
    }
    return (ProjectManager.html);
  },
  after: function() {

  },
  DirListener: function(dir) {
    ProjectManager.check(dir, '', {}, 'side');
  },
  runScript: async function() {
    var fs = ProjectManager.fs;
    await fs.runCommandLine("'" + ProjectManager.pjFile + "' '" + ProjectManager.cdir + "'", (err, stdout) => {
      if (err) {
        ProjectManager.logToUser(err);
      } else {
        ProjectManager.logToUser(stdout);
      }
    }, ProjectManager.cdir);
  },
  editScript: function() {
    ProjectManager.extMan.getExtCommand('editEntryCommand').command(ProjectManager.pjFile);
  },
  editMaskFile: async function() {
    const mpath = await ProjectManager.fs.appendPath(ProjectManager.cdir, 'maskfile.md')
    ProjectManager.extMan.getExtCommand('editEntryCommand').command(mpath);
  },
  editNpmFile: async function() {
    const ppath = await ProjectManager.fs.appendPath(ProjectManager.cdir, 'package.json')
    ProjectManager.extMan.getExtCommand('editEntryCommand').command(ppath);
  },
  runMaskFile: async function(command) {
    await ProjectManager.fs.runCommandLine(`mask ${command}`, (err, stdout) => {
      if (err) {
        ProjectManager.logToUser(err);
      } else {
        ProjectManager.logToUser(stdout);
      }
    }, ProjectManager.cdir);
  },
  runNpmFile: async function(command) {
    await ProjectManager.fs.runCommandLine(`npm run ${command}`, (err, stdout) => {
      if (err) {
        ProjectManager.logToUser(err);
      } else {
        ProjectManager.logToUser(stdout);
      }
    }, ProjectManager.cdir);
  },
  logToUser: function(msg) {
    if (ProjectManager.log) {
      ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', msg);
    }
  },
  logOn: async function() {
    ProjectManager.log = true;
    await ProjectManager.savePrefs();
  },
  logOff: async function() {
    ProjectManager.log = false;
    await ProjectManager.savePrefs();
  },
  getProjDirFile: async function() {
    var fs = ProjectManager.fs;
    var pjf = await fs.appendPath(ProjectManager.hdir, '.projects');
    if (await fs.fileExists(pjf)) return (pjf);
    var cfgdir = await fs.getConfigDir();
    pjf = await fs.appendPath(cfgdir, '.projects');
    return (pjf);
  },
  goto: async function() {
    var projfile = await ProjectManager.getProjDirFile();
    ProjectManager.getProjDir('Which Project?', projfile, async (result) => {
      var fs = ProjectManager.fs;
      var path = await fs.normalize(result);
      ProjectManager.extMan.getExtCommand('changeDir').command({
        path: path
      });
    });
  },
  getProjNote: async function(title, pfile, returnFun) {
    var fs = ProjectManager.fs;
    var projs = await fs.getDirList(pfile);
    var nfiles = [];
    projs.forEach(item => {
      nfiles.push({
        name: item.name,
        value: item
      });
    });
    if (projs.length > 0) ProjectManager.extMan.getExtCommand('pickItem').command(title, nfiles, returnFun);
    else ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', 'Sorry, no project notes yet.');
  },
  getProjDir: async function(title, pfile, returnFun) {
    var fs = ProjectManager.fs;
    var projs = await fs.readFile(pfile);
    projs = new String(projs).split('\n');
    var dirs = [];
    projs.forEach(proj => {
      if (proj.includes('|')) {
        var part = proj.split('|');
        dirs.push({
          name: part[0],
          value: part[1]
        })
      }
    });
    console.log(dirs);
    if (dirs.length > 0) ProjectManager.extMan.getExtCommand('pickItem').command(title, dirs, returnFun);
    else ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', 'Sorry, no projects defined yet.');
  },
  create: function() {
    ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager', 'What is the project\'s name?', async (result) => {
      var pjf = await ProjectManager.getProjDirFile();
      var cur = ProjectManager.extMan.getExtCommand('getCursor').command();
      var fs = ProjectManager.extMan.getLocalFS();
      var projs = await fs.readFile(pjf);
      projs = new String(projs).split('\n');
      projs.push(result.trim() + '|' + cur.entry.dir);
      projs = projs.filter(item => {
        if (item.includes('|')) return (true);
        return (false);
      });
      await fs.writeFile(pjf, projs.join('\n'));
      await fs.createFile({
        dir: cur.entry.dir,
        name: '.startproject'
      });
    });
  },
  remove: async function() {
    var pjf = await ProjectManager.getProjDirFile();
    ProjectManager.getProjDir('Which Project?', pjf, async (result) => {
      var fs = ProjectManager.extMan.getLocalFS();
      var path = await fs.normalize(result);
      var projs = await fs.readFile(pjf);
      projs = new String(projs).split('\n');
      projs = projs.filter(proj => {
        if (proj.includes('|')) {
          var part = proj.split('|');
          if (part[1] === path) return (false);
          else return (true);
        }
      });
      await fs.writeFile(pjf, projs.join('\n'));
    });
  },
  openNote: function() {
    if (ProjectManager.noteDir !== '') {
      ProjectManager.getProjNote('Which Note?', ProjectManager.noteDir, result => {
        ProjectManager.extMan.getExtCommand('editEntryCommand').command(result);
      });
    } else {
      ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', 'Project directory not set.')
    }
  },
  openFileNote: async function() {
    if (ProjectManager.noteDir !== '') {
      var cur = ProjectManager.extMan.getExtCommand('getCursor').command();
      var entry = { ...cur.entry };
      entry.name = cur.entry.name + ProjectManager.noteExt;
      entry.dir = ProjectManager.noteDir;
      var fs = ProjectManager.extMan.getLocalFS();
      if (! await fs.fileExists(entry)) {
        await fs.createFile(entry);
      }
      ProjectManager.extMan.getExtCommand('editEntryCommand').command(entry);
    } else {
      ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', 'Project directory not set.')
    }
  },
  createProjNote: async function() {
    if (ProjectManager.noteDir !== '') {
      ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager', 'What is the note\'s name?', async (result) => {
        var fs = ProjectManager.extMan.getLocalFS();
        await fs.createFile({
          dir: ProjectManager.noteDir,
          name: result.trim(),
          fileSystem: fs
        });
        ProjectManager.extMan.getExtCommand('editEntryCommand').command({
          dir: ProjectManager.noteDir,
          name: result.trim(),
          fileSystem: fs
        });
      });
    } else {
      ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', 'Project directory not set.')
    }
  },
  setNoteExt: function() {
    ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager', 'What is the note\'s name?', async (result) => {
      ProjectManager.noteExt = result.trim();
      await ProjectManager.savePrefs();
    });
  },
  savePrefs: async function() {
    var fs = ProjectManager.extMan.getLocalFS();
    var cfgdir = await fs.getConfigDir();
    var pjf = await fs.appendPath(cfgdir, ProjectManager.prefName);
    await fs.writeFile(pjf, JSON.stringify({
      log: ProjectManager.log,
      ext: ProjectManager.noteExt
    }));
  },
  loadPrefs: async function() {
    var fs = ProjectManager.extMan.getLocalFS();
    var configDir = await fs.getConfigDir();
    var pjf = await fs.appendPath(configDir, ProjectManager.prefName);
    if (await fs.fileExists(pjf)) {
      var pref = await fs.readFile(pjf);
      pref = JSON.parse(pref);
      ProjectManager.log = pref.log;
      ProjectManager.noteExt = pref.ext;
    } else {
      await ProjectManager.savePrefs();
    }
  },
  getTemplateFile: async function() {
    var fs = ProjectManager.extMan.getLocalFS();

    //
    // See if they have the project manager for fig installed and using.
    //
    var tempf = await fs.appendPath(ProjectManager.hdir, '.projectFiles/projectmanager.json');
    if (await fs.fileExists(tempf)) {
      ProjectManager.templates = await fs.readFile(tempf);
      ProjectManager.templates = JSON.parse(ProjectManager.templates);
      ProjectManager.templates = ProjectManager.templates.templates;
    } else {
      var cdir = await fs.getConfigDir();
      tempf = await fs.appendPath(cdir, 'templates.json');
      if (await fs.fileExists(tempf)) {
        ProjectManager.templates = await fs.readFile(tempf);
        ProjectManager.templates = JSON.parse(ProjectManager.templates);
      } else {
        //
        // They have never ran templates. Add the default and return it.
        //
        ProjectManager.templates = [{
          name: "Svelte Template",
          templateDirUrl: "sveltejs/template",
          local: false,
          runScript: "npm install;"
        }, {
          name: "Sapper Template",
          templateDirUrl: "sveltejs/sapper-template#rollup",
          local: false,
          runScript: "npm install;"
        }];
        await ProjectManager.saveTemplateFile();
      }
    }
    return (ProjectManager.templates);
  },
  saveTemplateFile: async function() {
    //
    // See if they have the project manager for fig installed and using.
    //
    var fs = ProjectManager.extMan.getLocalFS();
    var tempf = await fs.appendPath(ProjectManager.hdir, '.projectFiles/projectmanager.json');
    var templates = {};
    if (await fs.fileExists(tempf)) {
      //
      // There is a fig templates file. Get it.
      //
      templates = fs.readFile(tempf);
      templates = JSON.parse(templates);
      templates.templates = ProjectManager.templates;
    } else {
      //
      // No fig based templates, create our own.
      //
      var cdir = await fs.getConfigDir();
      tempf = await fs.appendPath(cdir, 'templates.json');
      templates = ProjectManager.templates;
    }
    //
    // Write the template file.
    //
    await fs.writeFile(tempf, JSON.stringify(templates));
  },
  getTemplate: async function(title, returnFun) {
    var templates = await ProjectManager.getTemplateFile();
    var dirs = [];
    templates.forEach(template => {
      dirs.push({
        name: template.name,
        value: template.name
      });
    });
    if (dirs.length > 0) ProjectManager.extMan.getExtCommand('pickItem').command(title, dirs, returnFun);
    else ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', 'Sorry, no templates defined yet.');
  },
  installTemplate: async function() {
    ProjectManager.getTemplate('Install Which Template?', async name => {
      //
      // Get the template from the array of templates.
      //
      var templates = await ProjectManager.getTemplateFile();
      var template = templates.find(item => item.name === name);

      //
      // Install it.
      //
      var cur = ProjectManager.extMan.getExtCommand('getCursor').command();
      var fs = ProjectManager.extMan.getLocalFS();
      if (template.local) {
        //
        // It's a local template on the computer. Copy the contents.
        //
        await fs.runCommandLine(`cp -R '${template.templateDirUrl}/' '${cur.entry.dir}';`, async (err, stdout) => {
          if (err) {
            ProjectManager.logToUser(err);
            console.log('Installing Template: ');
            console.log(err);
          } else {
            ProjectManager.logToUser(stdout);
            //
            // Run the install script.
            //
            await fs.runCommandLine(`${template.runScript}`, (err, stdout) => {
              if (err) ProjectManager.logToUser(err);
              ProjectManager.logToUser(stdout);
            }, {}, {
              cwd: cur.entry.dir
            });
          }
        }, {}, {
          cwd: cur.entry.dir
        });
      } else {
        //
        // It's a web template. Copy it down to the directory.
        //
        await fs.runCommandLine(`npx degit --force '${template.templateDirUrl}' '${cur.entry.dir}';`, async (err, stdout) => {
          if (err) {
            ProjectManager.logToUser(err);
            console.log('Installing web template: ');
            console.log(err);
          } else {
            ProjectManager.logToUser(stdout);

            //
            // Run the install script.
            //
            await fs.runCommandLine(`${template.runScript}`, (err, stdout) => {
              if (err) ProjectManager.logToUser(err);
              ProjectManager.logToUser(stdout);
            }, {}, {
              cwd: cur.entry.dir
            });
          }
        }, {}, {
          cwd: cur.entry.dir
        });
      }
      //
      // Make the Notes directory and the startup script for the project.
      //
      const nfile = await fs.appendPath(cur.entry.dir, '.notes');
      await fs.makeDir(nfile);
      await fs.createFile(cur.entry.dir, '.startproject');
    });
  },
  makeWebTemplate: async function() {
    var templates = await ProjectManager.getTemplateFile();

    //
    // Get the name for the template.
    //
    ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager', 'What is the template\'s name?', (name) => {
      //
      // Get the install script to run.
      //
      setTimeout(() => {
        ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager', 'What is the GitHub template name?', (wtmp) => {
          setTimeout(() => {
            ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager', 'What is the install command line?', async (script) => {
              templates.push({
                name: name,
                templateDirUrl: wtmp,
                local: false,
                runScript: script
              });
              ProjectManager.templates = templates;
              await ProjectManager.saveTemplateFile();
            });
          }, 100);
        });
      }, 100);
    });
  },
  makeLocalTemplate: async function() {
    var cur = ProjectManager.extMan.getExtCommand('getCursor').command();
    var templates = await ProjectManager.getTemplateFile();

    //
    // Get the name for the template.
    //
    ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager', 'What is the template\'s name?', (name) => {
      //
      // Get the install script to run.
      //
      setTimeout(() => {
        ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager', 'What is the install command line?', async (script) => {
          templates.push({
            name: name,
            templateDirUrl: cur.entry.dir,
            local: true,
            runScript: script
          });
          ProjectManager.templates = templates;
          await ProjectManager.saveTemplateFile();
        });
      }, 100);
    });
  },
  removeTemplate: async function() {
    ProjectManager.getTemplate('Remove Which Template?', async name => {
      //
      // Remove the template from the array of templates.
      //
      var templates = await ProjectManager.getTemplateFile();
      ProjectManager.templates = templates.filter(item => item.name !== name);
      await ProjectManager.saveTemplateFile();
    });
  },
  gotoTemplate: function() {
    ProjectManager.getTemplate('Go to Which Template?', async name => {
      //
      // Get the template from the array of templates.
      //
      var templates = await ProjectManager.getTemplateFile();
      var template = templates.find(item => item.name === name);
      if (template.local) {
        //
        // Go to the template directory since it's local.
        //
        ProjectManager.extMan.getExtCommand('changeDir').command({
          path: template.templateDirUrl,
          name: template.templateDirUrl
        });
      } else {
        //
        // Open the website for the template.
        //
        const lfs = ProjectManager.extMan.getLocalFS();
        await lfs.runCommandLine(`open 'https://GitHub.com/${template.templateDirUrl}';`, (err, stdout) => {
          if (err) {
            ProjectManager.logToUser(err);
            console.log('Opening web template: ');
            console.log(err);
          } else {
            ProjectManager.logToUser(stdout);
          }
        }, {}, {});
      }
    });
  }
};
return (ProjectManager);

