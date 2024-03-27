  var vDupsTable;
  var vLastPlSelectionCntrDupsTab = 0;
  var vDupsTableLastSearchCol = '';
  var vDupsTabLoading = false;
  var vSortCount = 0;

  var vModePlaylist = 'Same'  // 'Across' or 'Same'
  var vModeSearch = 'Track Id'  // 'Track Id' or 'Nad' = TrackName/ArtistName/Duration

  const cbAutoSel = 'Auto Select Dups';
  const cbRmTracksById = 'Select Playlist';



  //-----------------------------------------------------------------------------------------------
  function dupsTab_init(tableHeight=300)
  {
    // console.log("dupsTab_initPlTab() - dupsTable ready()");

    // after a clear put the radio btns back into the initial state (needed for firefox)
    $(rPlModeAcross).prop('checked',true);
    $(rPlSearchId).prop('checked',true);

    // must be before table creation
    // add search input boxes to the dom at the bottom of the desired columns
    let ftIdx = 0;
    $('#dupsTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        $(this).html('<button onclick="dupsTab_btnClearSearchPlOnClick()" class="btnClrSearch" title="Clear search">x</button>');
      }
      if (ftIdx !== 0)
      {
        let ibName = 'dupsColSearchIB' + ftIdx;
        $(this).html('<input type="text" name="' + ibName + '" placeholder="Search"/>');
      }
      ftIdx += 1;
    } );

    vDupsTable = $('#dupsTable').DataTable(
    {
      "fnRowCallback": function(nRow, rowData)
      {
          if (rowData[11] === 1)
          { $('td', nRow).addClass('clrDup'); }

          if (rowData[12] != vUserId)   // playlistOwnerId != vUserId
            $('td:eq(0)', nRow).addClass('disabledCkBx');

          if (!rowData[8])  // !trackId tests for "", null, undefined, false, 0, NaN
            $('td:eq(0)', nRow).addClass('disabledCkBx');
      },

      initComplete: function()  //col search: https://datatables.net/examples/api/multi_filter.html
      {
        this.api().columns().every(function()
        {
          let that = this;
          $('input', this.footer()).on('keyup change clear', function()
          {
            if (that.search() !== this.value)
            {
              vDupsTableLastSearchCol = this.name;
              that.search(this.value)
              that.draw();
            }
          });
        });
      },

      // dom default: lfrtip; ('r', 't' provides processing, table) (no 'f, 'p', 'i' removes search btn, paging info)
      "dom":            "rt",
      "scrollY":         tableHeight - 91,  // compensate for extra height for radio btns that the other tabs do not have
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false, // background color of sorted column does not change
      "order":           [],
      columnDefs: [ { targets:  0, className: 'select-checkbox', orderable: false },
                    { targets:  9, visible: false, searchable: false },
                    { targets: 10, visible: false, searchable: false },
                    { targets: 11, visible: false, searchable: false },
                    { targets: 12, visible: false, searchable: false } ],
      select: { style: 'multi' }
    });
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_redraw()
  {
    // console.log('__SF__dupsTab_redraw()');
    vDupsTable.columns.adjust().draw();
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afActivate(curPlSelectionCntr)
  {
    try
    {
      // console.log('__SF__dupsTab_activate()');
      // console.log('__SF__dupsTab_activate() - lastCnt = ' + vLastPlSelectionCntrDupsTab + ', curCnt = ' + curPlSelectionCntr);

      // if you click "Playlists selected on this tab determines..." at the bottom of the plTab load times for each tab will be displayed (for dbg)
      let t0;
      if (vShowExeTm == 1)
      {
        $("#dupsTab_ExeTm").text(0);
        t0 = Date.now();
      }

      if (vLastPlSelectionCntrDupsTab !== curPlSelectionCntr)
      {
        vLastPlSelectionCntrDupsTab = curPlSelectionCntr;
        vDupsTabLoading = true;

        // this works better if the clear tables are here instead of being inside async calls
        // we are reloading both tables so we empty them out
        vDupsTable.clear().draw();

        // console.log('__SF__dupsTab_afActivate() - start loading');
        $("#dupsTab_info3").text('');
        tabs_set2Labels('dupsTab_info1', 'Loading...', 'dupsTab_info2', 'Loading...');
        tabs_progBarStart('dupsTab_progBar', 'dupsTab_progStat1', 'Finding Duplicates...', showStrImmed=true);

        let cbAuto = $('#dupsTab_cbAutoSel');
        cbAuto.empty();
        cbAuto.append($('<option>', { value: 0, text : cbAutoSel }));
        cbAuto.append($('<option>', { value: 1, text : 'Select First' }));
        cbAuto.append($('<option>', { value: 2, text : 'Select Second' }));
        cbAuto.append($('<option>', { value: 3, text : 'Clear' }));

        let cbDuration = $('#dupsTab_cbDuration');
        cbDuration.empty();
        cbDuration.append($('<option>', { value: '1', text : '1 sec' }));
        cbDuration.append($('<option>', { value: '2', text : '2 secs' }));
        cbDuration.append($('<option>', { value: '3', text : '3 secs' }));
        cbDuration.append($('<option>', { value: '4', text : '4 secs' }));
        cbDuration.append($('<option>', { value: '5', text : '5 secs' }));
        cbDuration.append($('<option>', { value: '10', text : '10 secs' }));
        cbDuration.append($('<option>', { value: '15', text : '15 secs' }));
        cbDuration.append($('<option>', { value: '20', text : '20 secs' }));
        cbDuration.append($('<option>', { value: '25', text : '25 secs' }));
        cbDuration.append($('<option>', { value: '30', text : '30 secs' }));
        cbDuration.append($('<option>', { value: '40', text : '40 secs' }));
        cbDuration.append($('<option>', { value: '50', text : '50 secs' }));
        cbDuration.append($('<option>', { value: '60', text : '60 secs' }));
        cbDuration.val(10).change();

        let cbRmPlId = $('#dupsTab_cbRmPlId');
        cbRmPlId.empty();
        cbRmPlId.append($('<option>', { value: 0, text : cbRmTracksById }));

        // await new Promise(resolve => setTimeout(resolve, 1000));

        await tracksTab_afLoadPlTracks();
        await dupsTab_afFindDups();
        await dupsTab_afLoadDupsTable();

        if (vShowExeTm == 1)
        {
          exeTm = Math.floor((Date.now() - t0) / 1000);
          $("#dupsTab_ExeTm").text(exeTm);
        }
        // console.log('__SF__dupsTab_afActivate() - loading done - exit');
      }
    }
    catch(err)
    {
      // console.log('__SF__dupsTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__dupsTab_afActivate() finally.');
      vDupsTabLoading = false;
      vSortCount = 1;
      tabs_progBarStop('dupsTab_progBar', 'dupsTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afLoadDupsTableSeq()
  {
    try
    {
      // console.log("dupsTab_afLoadDupsTableSeq()");
      vDupsTabLoading = true;
      tabs_set2Labels('dupsTab_info1', 'Loading...', 'dupsTab_info2', 'Loading...');
      tabs_progBarStart('dupsTab_progBar', 'dupsTab_progStat1', 'Finding Duplicates...', showStrImmed=true);

      vDupsTable.order([]); // remove sorting
      vDupsTable.clear().draw();
      await dupsTab_afLoadDupsTable();
    }
    catch(err)
    {
      // console.log('__SF__dupsTab_afLoadDupsTableSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__dupsTab_afLoadDupsTableSeq() finally.');
      vSortCount = 1;
      // console.log('__SF__dupsTab_afLoadDupsTableSeq() sort count = ' + vSortCount);
      vDupsTabLoading = false;
      tabs_progBarStop('dupsTab_progBar', 'dupsTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_radioBtnEventMode() { /* make function appear in pycharm structure list */ }
  $('input[type=radio][name=rPlMode]').click(function()
  {
    if (vDupsTabLoading === true)
    {
      $("#dupsTab_info3").text("Duplicates Tab is loading. Please switch playlist mode when loading is complete.");
      setTimeout(function ()
      {
        $("#dupsTab_info3").text('');
      }, 4500);
      return false;
    }

    dupsTab_afFindDupsSeq();
  });

  //-----------------------------------------------------------------------------------------------
  function dupsTab_radioBtnEventSearch() { /* make function appear in pycharm structure list */ }
  $('input[type=radio][name=rPlSearch]').click(function()
  {
    if (vDupsTabLoading === true)
    {
      $("#dupsTab_info3").text("Duplicates Tab is loading. Please switch search mode when loading is complete.");
      setTimeout(function ()
      {
        $("#dupsTab_info3").text('');
      }, 4500);
      return false;
    }
    dupsTab_afFindDupsSeq()
  });

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afFindDupsSeq()
  {
    try
    {
      // console.log('__SF__dupsTab_afFindDupsSeq()');
      vDupsTabLoading = true;
      vDupsTable.clear().draw();

      // console.log('__SF__dupsTab_afFindDupsSeq() - start loading');
      $("#dupsTab_info3").text('');
      tabs_set2Labels('dupsTab_info1', 'Loading...', 'dupsTab_info2', 'Loading...');
      tabs_progBarStart('dupsTab_progBar', 'dupsTab_progStat1', 'Finding Duplicates...', showStrImmed=true);
      // await new Promise(resolve => setTimeout(resolve, 1000));

      await dupsTab_afFindDups();
      await dupsTab_afLoadDupsTable();

      // console.log('__SF__dupsTab_afFindDupsSeq() - loading done - exit');
    }
    catch(err)
    {
      // console.log('__SF__dupsTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__dupsTab_afFindDupsSeq() finally.');
      vDupsTabLoading = false;
      tabs_progBarStop('dupsTab_progBar', 'dupsTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afFindDups()
  {
    // var vModePlaylist = 'Across'  // or 'Same'
    // var vModeSearch = 'Track Id'  // or 'Nad' = TrackName/ArtistName/Duration

    // console.log('__SF__dupsTab_afFindDups()');

    vModePlaylist = $("input[name='rPlMode']:checked").val();
    vModeSearch = $("input[name='rPlSearch']:checked").val();
    let durTimeDiff = $('#dupsTab_cbDuration').val();
    // console.log('__SF__dupsTab_afFindDups() - radio btn values vModePlaylist = ' + vModePlaylist + ', vModeSearch = ' + vModeSearch)

    console.log('__SF__dupsTab_afFindDups() - vUrl - findDups');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ findDups: 'FindDups', modePlaylist: vModePlaylist, modeSearch: vModeSearch, durTimeDiff: durTimeDiff }), });
    if (!response.ok)
      tabs_throwErrHttp('dupsTab_afFindDups()', response.status, 'dupsTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__dupsTab_afLoadPlDict() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('dupsTab_afFindDups()', reply['errRsp'], 'dupsTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_setupRmPlId(dupsTrackList)
  {
    let cbRmPlId = $('#dupsTab_cbRmPlId');
    let btnRmPlId = $('#dupsTab_btnRmTracksById');
    cbRmPlId.empty();
    cbRmPlId.append($('<option>', {value: 0, text: cbRmTracksById}));

    let cnt = 0;


    vModePlaylist = $("input[name='rPlMode']:checked").val();
    if ((plTabs_getSelectedCnt() === 2) && (vModePlaylist === 'Across'))
    {
      cbRmPlId.css('opacity', '1.0');
      cbRmPlId.prop("disabled", false); // exactly 2 playlists selected on plTab so enable
      btnRmPlId.css('opacity', '1.0');
      btnRmPlId.prop("disabled", false); // exactly 2 playlists selected on plTab so enable

      // load the remove by playlist drop down combo
      let listUniquePl = [];
      $.each(dupsTrackList, function (key, tvals)
      {
        cnt += 1;

        // console.log('load dup table pl owner id = ' + tvals['Playlist Owners Id']);
        if (tvals['Playlist Owners Id'] == vUserId)
        {
          idNm = tvals['Playlist Id'] + '::::' + tvals['Playlist Name'];
          plNm = tvals['Playlist Name'];
          if (plNm.length > 84)
            plNm = plNm.slice(0, 84) + '...';
          // console.log('dupsTab_setupRmPlId() - idNm = \n' + idNm + ',   plNm = ' + plNm);
          cbRmPlId.append($('<option>', {value: idNm, text: plNm}));
        }

        if (listUniquePl.includes(tvals['Playlist Id']) == false)
          listUniquePl.push(tvals['Playlist Id']);

        // once we found 2 unique playlists we can exit
        if (listUniquePl.length === 2)
           return false;
      });
    }
    else
    {
      cbRmPlId.css('opacity', '0.2');
      cbRmPlId.prop("disabled", true); // more than 2 playlists selected on plTab so disable
      btnRmPlId.css('opacity', '0.2');
      btnRmPlId.prop("disabled", true); // more than 2 playlists selected on plTab so disable
    }
    // console.log('dupsTab_setupRmPlId   cnt = ' + cnt);
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_setupAutoSel()
  {
    // enable/disable the auto select dropdown combo box
    let cbAuto = $('#dupsTab_cbAutoSel')
    if (plTabs_getSelectedCnt() > 2)
    {
      cbAuto.css('opacity', '0.2');
      cbAuto.prop("disabled", true); // more than 2 playlists selected on plTab so disable
    }
    else
    {
      cbAuto.css('opacity', '1.0');
      cbAuto.prop("disabled", false); // 1 or 2 playlists selected on plTab so enable
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afLoadDupsTable()
  {
    console.log('__SF__dupsTab_afLoadPlTable() - vUrl - getDupsTrackList');
    let durTimeDiff = $('#dupsTab_cbDuration').val();
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ getDupsTrackList: 'getDupsTrackList', modePlayList: vModePlaylist, modeSearch: vModeSearch, durTimeDiff: durTimeDiff }), });
                                       // this will reproduce the error: browser's cache is using old version of this javascript file
                                       // body: JSON.stringify({ getDupsTrackList: 'getDupsTrackList', modePlayList: vModePlaylist, modeSearch: vModeSearch }), });
    if (!response.ok)
      tabs_throwErrHttp('dupsTab_afLoadDupsTable()', response.status, 'dupsTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__dupsTab_afLoadPlTable() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('dupsTab_afLoadDupsTable()', reply['errRsp'], 'dupsTab_errInfo')

      // load the dups track table
      let idx = 0;
      let dupsTrackList = reply['dupsTrackList'];
      let dupsClrList = reply['dupsClrList'];
      $.each(dupsTrackList, function(key, tvals)
      {
        vDupsTable.row.add(['', tvals['Track Name'], tvals['Playlist Name'], tvals['Track Position'], tvals['Artist Name'],
                                tvals['Album Name'], tvals['Duration Hms'], tvals['Playlist Owners Name'], tvals['Track Id'],
                                tvals['Playlist Id'], tvals['Track Uri'], dupsClrList[idx], tvals['Playlist Owners Id'] ]);
        idx++;
        // console.log('track name: ' + tvals['Track Name'] + ', track id: ' + tvals['Track Id']);
      });
      vDupsTable.draw();

      dupsTab_setupRmPlId(dupsTrackList);
      dupsTab_setupAutoSel();

      dupsTab_updateSelectedCnt();
      let infoStr2 = 'Duplicates in Selected Playlists: ' +  reply['numDupsMatch'];;
      tabs_setLabel('dupsTab_info2', infoStr2);

      if (reply['numDupsMatch'] == 0)
      {
        // var vModePlaylist = 'Same'  // 'Across' or 'Same'
        // var vModeSearch = 'Track Id'  // 'Track Id' or 'Nad' = TrackName/ArtistName/Duration
        mode = 'not set';
        if (vModePlaylist == 'Same')
          mode = 'using: [In Same Playlist]';
        else
          mode = 'using: [Across Playlists]';

        search = 'not set';
        if (vModeSearch == 'Track Id')
          search = ' & [Exact Match]';
        else
          search = ' & [Very Close Match]';

        msg = 'No Duplicates found in selected playlists ' + mode + search;

        $("#dupsTab_info3").text(msg);
      }
    }
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_dupsTableRow_onUserSelect() { /* make function appear in pycharm structure list */ }
  $('#dupsTable').on('user-select.dt', function (e, dt, type, cell, originalEvent)
  {
    // console.log('dupsTab_dupsTableRow_onUserSelect() --- user-select.dt');
    // this onUser method is called prior to the checkbox being updated
    // we use it to tell the user you can not select a track you do not own
    // we use it to tell the user they have hit the 100 track selection limit

    let rowAlreadySelected = false;
    let rowNum = cell.index().row;
    vDupsTable.rows({selected: true}).every(function (rowIdx, tableLoop, rowLoop)
    {
      if (rowNum === rowIdx)
      {
        rowAlreadySelected = true;
        return false;
      }
    });


    // console.log('__SF__dupsTab_dupsTableRow_onUserSelect(): rowData = \n' + JSON.stringify(rowData, null, 4));
    if (rowAlreadySelected == false)
    {
      let rowData = vDupsTable.row(cell.node()).data()
      if (rowData[12] != vUserId)    // playlistOwnerId != vUserId
      {
        e.preventDefault();
        $("#dupsTab_info3").text("Track can not be selected/removed since you are not the playlist owner.");
        setTimeout(function ()
        {
          $("#dupsTab_info3").text('');
        }, 4500);
        return;
      }

      if (!rowData[8])    // !trackId tests for "", null, undefined, false, 0, NaN
      {
        e.preventDefault();
        $("#dupsTab_info3").text("Track can not be selected/removed since it does not have a track id.");
        setTimeout(function ()
        {
          $("#dupsTab_info3").text('');
        }, 4500);
        return;
      }

      let count = vDupsTable.rows({selected: true}).count();
      if (count === vSpotifyRmLimit)
      {
        e.preventDefault();
        // alert('You have hit the track selection limit. The limit is 100 tracks.\n\n' +
        //       'This is a Spotify limit.\n' +
        //       'Spotify limits the number of tracks that can be removed per call to 100.\n\n');
        $("#dupsTab_info3").text(vSpotifyRmLimitMsg);
        setTimeout(function ()
        {
          $("#dupsTab_info3").text('');
        }, 4500);
        return;
      }
    }
  });

  //-----------------------------------------------------------------------------------------------
  // function dupsTab_dupsTableRow_onUserDeselect() { /* make function appear in pycharm structure list */ }
  // $('#dupsTable').on('user-deselect.dt', function (e, dt, type, cell, originalEvent)
  // {
  //   console.log('dupsTab_dupsTableRow_onUserDeselect() --- user-deselect.dt');
  //   // console.log('__SF__dupsTab_dupsTableRow_onUserDeselect(): rowData = \n' + JSON.stringify(rowData, null, 4));
  //   dupsTab_updateSelectedCnt();
  // });

  //-----------------------------------------------------------------------------------------------
  function dupsTab_dupsTableSelect() { /* make function appear in pycharm structure list */ }
  $('#dupsTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    // console.log('dupsTab_dupsTableRow_onUserDeselect() --- select.dt');
    // this method is called after the checkbox has been selected so we update the selected count
    dupsTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function dupsTab_dupsTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#dupsTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    // console.log('dupsTab_dupsTableDeselect() --- deselect.dt');
    // this method is called after the checkbox has been deselected so we update the selected count
    dupsTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function dupsTab_dupsTableOrder() { /* make function appear in pycharm structure list */ }
  $('#dupsTable').on( 'order.dt', function ()
  {
      // need to know if user has sorted the table because auto select needs to clear sorting before auto selecting rows
      vSortCount += 1;
      // console.log('dupsTab_dupsTableOrder() --- order.dt  sort count = ' + vSortCount);
  } );

  //-----------------------------------------------------------------------------------------------
  function dupsTab_btnClearSearchPlOnClick(focusOnField = true)
  {
    //console.log('__SF__dupsTab_btnClearSearchPlOnClick()');
    // clear search boxes under pl table
    $("input[name^='dupsColSearchIB']").each(function()
    {
      // for unknown reasons there are 12 instead of 6 input search boxes. clear them all...ugh
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    if (focusOnField)
    {
      // last element edited gets focus
      let searchInputBox = $('input[name="' + vDupsTableLastSearchCol + '"]');
      searchInputBox.focus();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_updateSelectedCnt()
  {
    //console.log('__SF__artistsTab_updateSelectedCnt()');
    let count = vDupsTable.rows({ selected: true }).count();
    tabs_setLabel('dupsTab_info1', 'Selected Tracks: ' + count);
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afRmTracksByPosSeq()
  {
    try
    {
      // console.log('__SF__dupsTab_afRmTracksByPosSeq()');
      vDupsTabLoading = true;

      tabs_progBarStart('dupsTab_progBar', 'dupsTab_progStat1', 'Removing Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let rowData;
      $.each(vDupsTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vDupsTable.row(this).data();
        // ignore tracks with a track uri containing: 'spotify:local:'  we can not delete them since the track id is null
        // example: user id: earono, plnm: Sing Songs, track: Stil with you Jungkook
        // if (rowData[10].indexOf("spotify:local:") == -1) ( we could do this instead of if (rowData[8]) )
        if (rowData[8])  // add the track uri to the list if the track id is not null
          rmTrackList.push({'Playlist Id': rowData[9], 'Track Uri': rowData[10], 'Track Position': parseInt(rowData[3])});
      });

      if (Object.keys(rmTrackList).length === 0)
      {
        alert('No tracks removed. Please select one or more tracks before pressing remove.')
        return
      }

      // vDupsTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__dupsTab_afRmTracksByPosSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afRmTracksByPos(rmTrackList);
      vDupsTable.clear();
      await dupsTab_afFindDups();
      await dupsTab_afLoadDupsTable();
    }
    catch(err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__dupsTab_afRmTracksByPosSeq() finally.');
      vDupsTabLoading = false;
      tabs_progBarStop('dupsTab_progBar', 'dupsTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_btnRmTracksByPos()
  {
    // console.log('__SF__dupsTab_btnRmTracksByPos()');
    dupsTab_afRmTracksByPosSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_btnClear()
  {
    // console.log('__SF__dupsTab_btnClear()');
    dupsTab_btnClearSearchPlOnClick(false);
    dupsTab_afLoadDupsTableSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_btnHelp()
  {
    // console.log('__SF__dupsTab_btnHelp()');
    vHtmlInfoFn = 'helpTextTabDups.html';
    $("#btnInfoTab")[0].click();
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_cbAutoSelOnChange()
  {
    // console.log('__SF__dupsTab_cbAutoSelOnChange()')
    let curSel = $('#dupsTab_cbAutoSel option:selected').text();
    // console.log('__SF__dupsTab_cbAutoSelOnChange() selected = ' + curSel);
    if (curSel === cbAutoSel)
      return;

    // undo any column sorting before auto selecting so the selections display in order rather than mixed up
    if (vSortCount > 1)
    {
      // console.log('auto sel doing a clear.  sort count = ' + vSortCount);
      $("#dupsTab_info3").text("Clearing column sort prior to doing auto selection.");
      setTimeout(function ()
      {
        $("#dupsTab_info3").text('');
      }, 4500);

      dupsTab_btnClearSearchPlOnClick();
      await dupsTab_afLoadDupsTableSeq();
    }
    else
    {
      // clear all selections prior to auto selecting
      vDupsTable.rows().deselect();
    }

    // [''0, tvals['Track Name']1, tvals['Playlist Name']2, tvals['Track Position']3, tvals['Artist Name']4,
    //      tvals['Album Name']5, tvals['Duration Hms']6, tvals['Playlist Owners Name']7, tvals['Track Id']8,
    //      tvals['Playlist Id']9, tvals['Track Uri']10, dupsClrList[idx]11, tvals['Playlist Owners Id']12 ]);

    let cntSelectd = 0;
    let skipOneOnClrChange = 1;
    let lastColor = ~vDupsTable.row(0).data()[11];
    vDupsTabLoading = true;

    if (curSel === 'Select First')
    {
      vDupsTable.rows().every(function ()
      {
        let rowData = this.data();

        if (lastColor != rowData[11])
          skipOneOnClrChange = 0;
        else
          skipOneOnClrChange = 1;

        if (skipOneOnClrChange == 0)
        {
          if ((rowData[12] == vUserId) && (rowData[8]))  // if usrId == plOwnderId And trackId is not "", null, undefined, false, 0, NaN
          {
            cntSelectd += 1;
            // console.log('auto sel doing a select first cntSelect = ' + cntSelectd);
            if (cntSelectd <= 100)
              this.select();
          }
        }

        lastColor = rowData[11];
      });
    }

    if (curSel === 'Select Second')
    {
      vDupsTable.rows().every(function ()
      {
        let rowData = this.data();

        if (lastColor != rowData[11])
          skipOneOnClrChange = 1;
        else
          skipOneOnClrChange = 0;

        if (skipOneOnClrChange == 0)
        {
          if ((rowData[12] == vUserId) && (rowData[8])) // if usrId == plOwnderId And trackId is not "", null, undefined, false, 0, NaN
          {
            cntSelectd += 1;
            // console.log('auto sel doing a select second cntSelect = ' + cntSelectd);
            if (cntSelectd <= 100)
              this.select();
          }
        }

        lastColor = rowData[11];
      });
    }

    if (cntSelectd > 100)
    {
       msg = 'Only the first 100 duplicate tracks selected.\n' +
             'Spotify limits the number of tracks that can be removed per call to 100.\n\n' +
             'Repeat the use of Auto Select until all the desired tracks are removed.\n\n' +
             'Press Ok and then press Remove to have the tracks removed.\n'
       alert(msg);
    }

    if (curSel === 'Clear')
    {
      vDupsTable.rows().every(function ()
      {
          this.deselect();
      });
    }
    vDupsTabLoading = false;

    $('#dupsTab_cbAutoSel').val(0);
    dupsTab_updateSelectedCnt();
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_cbRmPlIdOnChange()
  {
    console.log('__SF__dupsTab_cbRmPlIdOnChange() - enter')
    let curSel = $('#dupsTab_cbRmPlId option:selected').text();
    if (curSel === cbRmTracksById)
      return;

    // // clear any selections since we are doing a rm tracks by pl
    // vDupsTable.rows().every(function ()
    // {
    //   this.deselect();
    // });
    vDupsTable.rows().deselect();

    console.log('__SF__dupsTab_cbRmPlIdOnChange() - exit')
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_btnRmTracksByIdOnClick()
  {
    console.log('__SF__dupsTab_btnRmTracksById()')

    let cbRmPlId = $('#dupsTab_cbRmPlId')
    let curSel = $('#dupsTab_cbRmPlId option:selected').text();
    // console.log('__SF__dupsTab_btnRmTracksById() selected = ' + curSel);
    if (curSel === cbRmTracksById)
    {
      alert('No tracks removed. Please select a playlist before pressing remove.');
      return;
    }

    let plIdPlNm = $('#dupsTab_cbRmPlId option:selected').val();
    plIdPlNm = plIdPlNm.split('::::', 2)
    // console.log('__SF__dupsTab_btnRmTracksById() plIdPlNam = ' + plIdPlNm);

    msg = 'All the duplicate tracks listed in the table for this playlist:\n\n' +
          '     ' + plIdPlNm[1] + '\n\n' +
          'will be removed.\n\n' +
          'Checkbox selections are ignored/not used.\n';

    if (confirm(msg) == true)
    {
     await dupsTab_afRmTracksByIdSeq(plIdPlNm[0]);
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afRmTracksByIdSeq(plId)
  {
    try
    {
      console.log('__SF__dupsTab_afRmTracksByIdSeq()');
      vDupsTabLoading = true;

      tabs_progBarStart('dupsTab_progBar', 'dupsTab_progStat1', 'Removing Tracks...', showStrImmed = true);

      // give the Removing Tracks a chance to appear before going into the loop recording track id's
      await new Promise(resolve => setTimeout(resolve, 1000));

      // [''0, tvals['Track Name']1, tvals['Playlist Name']2, tvals['Track Position']3, tvals['Artist Name']4,
      //      tvals['Album Name']5, tvals['Duration Hms']6, tvals['Playlist Owners Name']7, tvals['Track Id']8,
      //      tvals['Playlist Id']9, tvals['Track Uri']10, dupsClrList[idx]11, tvals['Playlist Owners Id']12 ]);

      let rowData;
      let rmTrackList = [];
      let rmTrackIdsSet = new Set();  // create a unique set of track ids (no duplicate tracks id)
      vDupsTable.rows().every(function ()
      {
        rowData = vDupsTable.row(this).data();
        if (rowData[9] == plId)
        {
          // originally we just passed a list of track ids but when adding support for episodes we now pass a list of track uri's
          if (rowData[10])  // track uri is not "", null, undefined, false, 0, NaN
          {
            // console.log('remove by id: track id = ' + rowData[10])

            // ignore tracks with a track uri containing: 'spotify:local:'  we can not delete them since the track id is null
            // example: user id: earono, plnm: Sing Songs, track: Stil with you Jungkook
            // if (rowData[10].indexOf("spotify:local:") == -1) ( we could do this instead of if (rowData[8]) )
            if (rowData[8]) // add the track uri to the list if the track id is not null
              rmTrackIdsSet.add(rowData[10]);
          }
        }
      });

      rmTrackList = Array.from(rmTrackIdsSet); // turn set into an array
      // console.log('__SF__dupsTab_afRmTracksByIdSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));

      let iRem = (Object.keys(rmTrackList).length);
      let numTracksToRm = iRem;
      if (iRem === 0)
        return

      let iStart = 0;
      let iEnd = 0;
      let reload = false;
      while (iRem > 0)
      {
        iStart = iEnd;
        if (iRem > 100)
        {
          iEnd = iEnd + 100;
          reload = 0;
        }
        else
        {
          iEnd = iEnd + iRem
          reload = numTracksToRm;  // reload > 0 tells rmTracksById() to reload pl, and total number of tracks removed
        }

        // console.log('iStart = ' + iStart + ', iEnd = ' + iEnd + ', iRem = ' + iRem);
        await dupsTab_afRmTracksById(plId, rmTrackList.slice(iStart, iEnd), reload);
        iRem = iRem - (iEnd - iStart);
        // console.log('iRem = ' + iRem);
      }

      vDupsTable.clear();
      await dupsTab_afFindDups();
      await dupsTab_afLoadDupsTable();
    }
    catch (err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__dupsTab_afRmTracksByIdSeq() finally.');
      vDupsTabLoading = false;
      tabs_progBarStop('dupsTab_progBar', 'dupsTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function dupsTab_afRmTracksById(plId, rmTrackList, reload)
  {
    vCurPlSelectionCntr = vCurPlSelectionCntr + 1;
    vCurTracksRmMvCpCntr = vCurTracksRmMvCpCntr + 1;
    
    // console.log('__SF__dupsTab_afRmTracksById() - vUrl - removeTracksById');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ rmTracksById: 'removeTracks', plId: plId, rmTrackList: rmTrackList, reload: reload}), });
    if (!response.ok)
      tabs_throwErrHttp('dupsTab_afRmTracksById()', response.status, 'dupsTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__dupsTab_afRmTracksById() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('dupsTab_afRmTracksById()', reply['errRsp'], 'dupsTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  function dupsTab_cbDurationOnChange()
  {
    // let durTimeDiff = $('#dupsTab_cbDuration').val();
    // console.log('__SF__dupsTab_cbDurationOnChange() durVal: ' + durTimeDiff);

    if (vDupsTabLoading)
      return;

    vModeSearch = $("input[name='rPlSearch']:checked").val();
    if (vModeSearch == 'Track Id')
      return;

    // were not loading and we are using nad/very close match
    // console.log('__SF__dupsTab_cbDurationOnChange() durVal: ' + durTimeDiff);
    dupsTab_afFindDupsSeq();
  }