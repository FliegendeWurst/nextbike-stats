#![feature(let_chains)]

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

use rusqlite::{params, Connection};
use serde_json::json;

fn main() {
	let db = Connection::open("nextbike.db").unwrap();
	let mut results = db.prepare("SELECT uid, time, lat, lng FROM pos").unwrap();

	let mut all_times = BTreeSet::new();
	let mut bikes: HashMap<_, Vec<_>> = HashMap::new();

	for (uid, time, lat, lng) in results
		.query_map(params![], |row| {
			Ok((
				row.get::<_, u64>(0).unwrap(),
				row.get::<_, u64>(1).unwrap(),
				row.get::<_, f64>(2).unwrap(),
				row.get::<_, f64>(3).unwrap(),
			))
		})
		.unwrap()
		.map(Result::unwrap)
	{
		bikes.entry(uid).or_default().push((time, lat, lng));
		all_times.insert(time);
	}
	let mut data = json!({"bikes": []});
	let bikes_json = data.get_mut("bikes").unwrap().as_array_mut().unwrap();
	for (bike_id, mut ts) in bikes {
		if ts.len() < 2 {
			continue;
		}
		ts.sort_by_key(|x| x.0);
		let ts = ts.into_iter().map(|x| (x.0, (x.1, x.2))).collect::<BTreeMap<_, _>>();

		let mut real_ts = vec![];

		let mut interpolated = 0;
		let mut max = 0;

		for &time in &all_times {
			if let Some(entry) = ts.get(&time).copied() {
				real_ts.push((time, entry.0, entry.1));
				interpolated = 0;
			} else {
				let prev = ts.range(..time).last().map(|x| (*x.0, *x.1));
				let next = ts.range(time..).next().map(|x| (*x.0, *x.1));
				if let Some(prev) = prev && let Some(next) = next {
					let a = (time - prev.0) as f64;
					let b = (next.0 - time) as f64;
					let c = (next.0 - prev.0) as f64;
					let d = (next.1.0 * b + prev.1.0 * a) / c;
					let e = (next.1.1 * b + prev.1.1 * a) / c;
					interpolated += 1;
					max = max.max(interpolated);
					real_ts.push((time, d, e));
				} else {
					let d = prev.or(next).unwrap();
					real_ts.push((time, d.1.0, d.1.1));
				}
			}
		}
		bikes_json.push(json!({"n": bike_id, "d": real_ts}));
		//eprintln!("{max:?}");
	}
	println!("{}", data);
}
